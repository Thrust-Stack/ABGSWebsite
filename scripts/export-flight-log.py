"""Export one active bench window from the Avionics SQLite log as web JSON.

The source database contains many sessions in one file. This exporter splits on
two-second gaps, selects the requested session, then picks the most active
window inside it. Avionics-Bay remains a read-only input; the generated JSON is
written into ABGSWebsite.
"""

from __future__ import annotations

import argparse
import json
import math
import sqlite3
from bisect import bisect_right
from datetime import datetime
from pathlib import Path


SESSION_GAP_SECONDS = 2.0
MAX_GYRO_RAD_S = math.radians(520)
MAX_ACCEL_M_S2 = 170.0
MAX_BENCH_ALTITUDE_M = 100.0


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value)


def split_sessions(rows: list[sqlite3.Row]) -> list[list[sqlite3.Row]]:
    sessions: list[list[sqlite3.Row]] = []
    current: list[sqlite3.Row] = []
    previous: datetime | None = None
    for row in rows:
        timestamp = parse_time(row["timestamp"])
        if previous and (timestamp - previous).total_seconds() >= SESSION_GAP_SECONDS:
            sessions.append(current)
            current = []
        current.append(row)
        previous = timestamp
    if current:
        sessions.append(current)
    return sessions


def choose_session(sessions: list[list[sqlite3.Row]], prefix: str) -> list[sqlite3.Row]:
    matches = [session for session in sessions if session[0]["timestamp"].startswith(prefix)]
    if not matches:
        starts = "\n".join(f"  {session[0]['timestamp']}" for session in sessions)
        raise SystemExit(f"No IMU session starts with {prefix!r}. Available starts:\n{starts}")
    return matches[0]


def activity(row: sqlite3.Row) -> float:
    rates = (row["gyro_x"], row["gyro_y"], row["gyro_z"])
    if any(not math.isfinite(value) or abs(value) > MAX_GYRO_RAD_S for value in rates):
        return 0.0
    return abs(rates[2]) + 0.25 * (abs(rates[0]) + abs(rates[1]))


def choose_window(session: list[sqlite3.Row], duration: float) -> list[sqlite3.Row]:
    times = [parse_time(row["timestamp"]) for row in session]
    scores = [activity(row) for row in session]
    best_start = 0
    best_score = -1.0
    end = 0
    running = 0.0
    for start, timestamp in enumerate(times):
        while end < len(times) and (times[end] - timestamp).total_seconds() <= duration:
            running += scores[end]
            end += 1
        if running > best_score:
            best_score = running
            best_start = start
        running -= scores[start]
    window_start = times[best_start]
    return [row for row in session if 0 <= (parse_time(row["timestamp"]) - window_start).total_seconds() <= duration]


def latest_before(rows: list[sqlite3.Row], timestamps: list[datetime], timestamp: datetime):
    index = bisect_right(timestamps, timestamp) - 1
    return rows[index] if index >= 0 else None


def valid_vector(values: tuple[float, float, float], limit: float) -> bool:
    return all(math.isfinite(value) and abs(value) <= limit for value in values)


def export(db_path: Path, output_path: Path, session_prefix: str, duration: float) -> None:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    imu_rows = connection.execute(
        "select timestamp, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z "
        "from imu order by timestamp"
    ).fetchall()
    altitude_rows = connection.execute(
        "select timestamp, agl_m from alt order by timestamp"
    ).fetchall()
    gps_rows = connection.execute(
        "select timestamp, lat, lon, speed_mph, heading_deg from gps order by timestamp"
    ).fetchall()
    connection.close()

    session = choose_session(split_sessions(imu_rows), session_prefix)
    window = choose_window(session, duration)
    origin = parse_time(window[0]["timestamp"])
    altitude_times = [parse_time(row["timestamp"]) for row in altitude_rows]
    gps_times = [parse_time(row["timestamp"]) for row in gps_rows]

    samples = []
    last_accel = [0.0, 0.0, 9.80665]
    last_gyro = [0.0, 0.0, 0.0]
    rejected = 0
    for row in window:
        timestamp = parse_time(row["timestamp"])
        accel = (row["accel_x"], row["accel_y"], row["accel_z"])
        gyro = (row["gyro_x"], row["gyro_y"], row["gyro_z"])
        valid = valid_vector(accel, MAX_ACCEL_M_S2) and valid_vector(gyro, MAX_GYRO_RAD_S)
        if valid:
            last_accel = [round(value, 4) for value in accel]
            last_gyro = [round(value, 5) for value in gyro]
        else:
            rejected += 1

        altitude = latest_before(altitude_rows, altitude_times, timestamp)
        agl = altitude["agl_m"] if altitude else None
        if agl is not None and (not math.isfinite(agl) or abs(agl) > MAX_BENCH_ALTITUDE_M):
            agl = None

        gps = latest_before(gps_rows, gps_times, timestamp)
        samples.append(
            {
                "t": round((timestamp - origin).total_seconds(), 3),
                "accelMps2": last_accel,
                "gyroRadS": last_gyro,
                "altitudeM": round(agl, 3) if agl is not None else None,
                "gps": (
                    {
                        "lat": round(gps["lat"], 7),
                        "lon": round(gps["lon"], 7),
                        "speedMps": round(gps["speed_mph"] * 0.44704, 3),
                        "headingRad": round(math.radians(gps["heading_deg"]), 5)
                        if gps["heading_deg"] is not None
                        else None,
                    }
                    if gps
                    else None
                ),
                "quality": {"valid": valid},
            }
        )

    payload = {
        "version": 1,
        "meta": {
            "label": "Bench replay",
            "source": "Avionics-Bay origin/Controls logs/flight_log.db",
            "sessionStart": window[0]["timestamp"],
            "sampleRateHz": 20,
            "gyroUnits": "rad/s",
            "attitude": "gyro-integrated estimate",
            "rejectedSamples": rejected,
        },
        "samples": samples,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote {len(samples)} samples ({samples[-1]['t']:.2f}s) to {output_path}; "
        f"rejected {rejected} outlier samples."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("db", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--session-start", required=True)
    parser.add_argument("--duration", type=float, default=30.0)
    args = parser.parse_args()
    export(args.db, args.output, args.session_start, args.duration)


if __name__ == "__main__":
    main()
