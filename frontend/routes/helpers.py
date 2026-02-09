"""
Shared helper functions for route blueprints
"""
import os
import subprocess

# Base path for pieces directories
PIECES_BASE_PATH = '/pieces'
if not os.path.isdir(PIECES_BASE_PATH):
    # Fallback for local development
    PIECES_BASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'pieces')


def get_git_hash(file_path):
    """Compute git hash-object for a file"""
    try:
        result = subprocess.run(
            ['git', 'hash-object', file_path],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None
