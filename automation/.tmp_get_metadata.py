import sys
import os
import json
# Redirect all print() statements to stderr so they don't interfere with JSON output
sys.stdout = sys.stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from gtm_tag_updater import GTMTagUpdater
    updater = GTMTagUpdater('gtm-oauth-credentials.json', '6245861811')
    metadata = updater.get_container_metadata('193298358', account_id='6245861811')
    # Write JSON directly to stdout file descriptor (fd 1) to bypass the stdout redirection
    result = json.dumps({"success": True, "metadata": metadata})
    os.write(1, result.encode('utf-8'))
    os.write(1, b'\n')
except Exception as e:
    # Return error details as JSON
    error_msg = str(e)
    error_type = type(e).__name__
    result = json.dumps({"success": False, "error": error_msg, "error_type": error_type})
    os.write(1, result.encode('utf-8'))
    os.write(1, b'\n')
