#!/bin/bash

# Script Name: replace_first_four_lines.sh
# Description: Replaces the first 4 lines of files listed in a file with new text.
# Usage: ./replace_first_four_lines.sh file_list.txt new_text.txt

# Check if the correct number of arguments is provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 file_list.txt new_text.txt"
    exit 1
fi

# Assign arguments to variables
FILE_LIST="$1"
NEW_TEXT_FILE="$2"

# Check if the file containing the list of file paths exists
if [ ! -f "$FILE_LIST" ]; then
    echo "Error: File list '$FILE_LIST' not found."
    exit 1
fi

# Check if the file containing the new text exists
if [ ! -f "$NEW_TEXT_FILE" ]; then
    echo "Error: New text file '$NEW_TEXT_FILE' not found."
    exit 1
fi

# Read the new text into a variable
NEW_TEXT=$(cat "$NEW_TEXT_FILE")

# Process each file listed in FILE_LIST
while IFS= read -r file; do
    # Check if the file exists
    if [ -f "$file" ]; then
        # Create a temporary file
        tmpfile=$(mktemp)

        # Write the new text to the temporary file
        echo "$NEW_TEXT" > "$tmpfile"

        # Append the original file from line 5 onwards to the temporary file
        tail -n +3 "$file" >> "$tmpfile"

        # Replace the original file with the temporary file
        mv "$tmpfile" "$file"

        echo "Replaced first 4 lines of '$file'"
    else
        echo "Warning: File '$file' not found. Skipping."
    fi
done < "$FILE_LIST"

