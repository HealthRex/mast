#!/usr/bin/env python3
"""
Template validator for benchmark.

This validator reads input text files and validates corresponding JSON output files
against the schema defined in schema.json and checks for correctness.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, Tuple, List

# Add scripts directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "scripts"))
from utils import validate_schema


def load_schema() -> Dict[str, Any]:
    """Load the JSON schema for this benchmark."""
    schema_path = Path(__file__).parent / "schema.json"
    with open(schema_path, 'r') as f:
        return json.load(f)


def load_input_file(input_path: Path) -> str:
    """Load input text file."""
    with open(input_path, 'r', encoding='utf-8') as f:
        return f.read().strip()


def load_output_file(output_path: Path) -> List[Dict[str, Any]]:
    """Load output JSON file."""
    with open(output_path, 'r', encoding='utf-8') as f:
        return json.load(f)




def validate_test_case(test_name: str) -> Tuple[bool, str]:
    """
    Validate a single test case.

    Args:
        test_name: Name of the test case (e.g., "test_001")

    Returns:
        Tuple of (is_valid, message)
    """
    try:
        # Load schema
        schema = load_schema()

        # File paths
        input_path = Path(__file__).parent / "inputs" / f"{test_name}.txt"
        output_path = Path(__file__).parent / "outputs" / f"{test_name}.json"

        # Check if files exist
        if not input_path.exists():
            return False, f"Input file not found: {input_path}"
        if not output_path.exists():
            return False, f"Output file not found: {output_path}"

        # Load files
        input_text = load_input_file(input_path)
        output_data = load_output_file(output_path)

        # Validate schema only (template - correctness validation to be implemented)
        is_schema_valid, schema_message = validate_schema(output_data, schema)
        if not is_schema_valid:
            return False, schema_message

        return True, "Test case passed (schema validation only)"

    except Exception as e:
        return False, f"Validation error: {str(e)}"


def main():
    """Main validation function."""
    if len(sys.argv) != 2:
        print("Usage: python validator.py <test_name>")
        sys.exit(1)
    
    test_name = sys.argv[1]
    is_valid, message = validate_test_case(test_name)
    
    if is_valid:
        print(f"✓ {test_name}: {message}")
        sys.exit(0)
    else:
        print(f"✗ {test_name}: {message}")
        sys.exit(1)


if __name__ == "__main__":
    main()
