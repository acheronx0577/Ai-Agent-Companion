#!/bin/bash

# --- Function for error handling ---
handle_error() {
  echo "Error: $1"
  exit 1
}

# --- Part 1: Set Google Cloud Project ID ---
API_KEY_FILE="$HOME/api_key.txt"
echo "--- Setting AI Studio API Key File ---"

read -r -s -p "Please enter your AI Studio API Key: " user_api_key
echo

if [[ -z "$user_api_key" ]]; then
  handle_error "No API KEY was entered."
fi

umask 077
printf '%s\n' "$user_api_key" > "$API_KEY_FILE"
if [[ $? -ne 0 ]]; then
  handle_error "Failed saving your API KEY."
fi
chmod 600 "$API_KEY_FILE" || handle_error "Failed setting permissions on your API KEY file."
echo "Successfully saved API KEY."



echo "--- Setup complete ---"
exit 0
