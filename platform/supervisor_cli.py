#!/usr/bin/env python3
"""
Supervisor CLI - Command line interface to control the supervisor.
"""

import argparse
import asyncio
import sys

import json

import nats
from nats.js.api import StreamConfig


STREAM_NAME = "SUPERVISOR_STREAM"
STREAM_SUBJECTS = ["supervisor.command.*"]


async def ensure_stream(js):
    """Create or update the JetStream stream for supervisor commands."""
    try:
        await js.find_stream_by_subject("supervisor.command.*")
    except nats.js.errors.NotFoundError:
        await js.add_stream(StreamConfig(
            name=STREAM_NAME,
            subjects=STREAM_SUBJECTS,
        ))


async def send_command(nats_url: str, command: str, service: str = "") -> str:
    """Send a command to the supervisor via JetStream and get the response."""
    nc = await nats.connect(nats_url)
    try:
        js = nc.jetstream()
        await ensure_stream(js)

        payload = json.dumps({"service": service}).encode()
        ack = await js.publish(
            f"supervisor.command.{command}",
            payload,
        )
        return f"Published to {ack.stream} (seq: {ack.seq})"
    finally:
        await nc.close()


async def main():
    parser = argparse.ArgumentParser(description="Supervisor CLI")
    parser.add_argument(
        "-n", "--nats-url",
        default="nats://localhost:4222",
        help="NATS server URL"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Start command
    start_parser = subparsers.add_parser("start", help="Start a service")
    start_parser.add_argument("service", help="Service name")

    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop a service")
    stop_parser.add_argument("service", help="Service name")

    # Restart command
    restart_parser = subparsers.add_parser("restart", help="Restart a service")
    restart_parser.add_argument("service", help="Service name")

    # Status command
    status_parser = subparsers.add_parser("status", help="Get service status")
    status_parser.add_argument("service", nargs="?", default="", help="Service name (optional)")

    # List command
    subparsers.add_parser("list", help="List all services")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        service = getattr(args, 'service', '')
        response = await send_command(args.nats_url, args.command, service)
        print(response)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
