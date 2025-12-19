# Medical AI Superintelligence Test (MAST) Leaderboard
## Overview

MAST (Medical AI Superintelligence Test) is a suite of clinically realistic benchmarks to evaluate real-world medical capabilities of artificial intelligence models. The system provides a leaderboard where AI models submit API endpoints that are automatically tested against standardized medical scenarios. This repository provides information and test files for ensuring proper functioning of custom model API endpoints.

## How It Works

1. **Submitters** provide a single API endpoint with authentication token
2. **Leaderboard admin** runs automated tests against all benchmarks using that endpoint
3. **API calls** are made with standardized prompts and test cases for each benchmark
4. **Responses** are validated for format compliance
5. **Results** are manually reviewed prior to publication on the leaderboard

## Structure

```
mast/
├── benchmarks/
│   ├── noharm/                # NOHARM benchmark
│   │   ├── prompt.md          # Base prompt for API requests
│   │   ├── schema.json        # Response validation schema
│   │   ├── validator.py       # API testing logic
│   │   ├── inputs/            # Test input files (.txt)
│   │   │   └── test_001.txt
│   │   └── outputs/           # Reference answers (kept)
│   │       └── test_001.json
│   └── template/              # Template for new benchmarks
├── results/                   # API response storage
│   └── noharm/                # Per-benchmark results
│       ├── test_001_response.json    # Raw API responses
│       └── test_001_validation.json  # Validation results
├── scripts/
│   ├── validate_all.py        # Master API tester
│   ├── config.json            # API endpoint configurations
│   └── config.example.json    # Template for submitters
├── docs/
│   ├── contributing.md        # Contribution guidelines
│   └── benchmark_descriptions.md  # Detailed benchmark info
└── README.md
```

## Quick Start

### For Submitters

1. **Clone the repository:**
```bash
git clone https://github.com/HealthRex/mast.git
cd mast
```

2. **Set up your API endpoint** locally or provide a hosted endpoint

3. **Configure your endpoint** by copying and editing the config:
```bash
cp scripts/config.example.json scripts/config.json
# Edit scripts/config.json with your API details
```

4. **Test your endpoint:**
```bash
python scripts/validate_all.py
```

### For Leaderboard Admins

1. **Collect submissions** from participants (API URL + token)

2. **Configure endpoint** in `scripts/config.json`:
```json
{
  "endpoint": {
    "url": "https://participant-api.com",
    "token": "participant_token",
    "timeout": 300
  }
}
```

3. **Run tests:**
```bash
python scripts/validate_all.py
```

4. **Review results** in the `results/` directory

## Prerequisites

Install required Python packages:
```bash
pip install jsonschema requests
```

## API Request Format

Each benchmark makes HTTP POST requests with:

- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer {token}`
  - `Content-Type: text/plain`
- **Body**: `prompt.md + "\n" + test_input.txt`
- **Timeout**: Up to 300 seconds

## Response Format

APIs must return JSON arrays in this format:
```json
[
  {
    "Option": 1,
    "GradeAI": "Appropriate",
    "Rationale": "Clinical justification..."
  },
  {
    "Option": 2,
    "GradeAI": "Inappropriate",
    "Rationale": "Clinical justification..."
  }
]
```

## Benchmarks

### NOHARM Benchmark

- **Paper**: https://arxiv.org/abs/2512.01241
- **Task**: Clinical decision support for primary care
- **Input**: Medical cases with multiple treatment options
- **Output**: Appropriateness ratings for each option
- **Validation**: Format compliance (schema validation only)

## Results Storage

All API responses are saved for auditability:

- **`test_XXX_response.json`**: Complete API response with metadata
- **`test_XXX_validation.json`**: Validation results and error details

## Contributing

We welcome contributions! See [docs/contributing.md](docs/contributing.md) for:

- Adding new benchmarks
- Creating test cases
- Implementing validators
- Best practices

## Dependencies

- Python 3.7+
- `jsonschema` - JSON schema validation
- `requests` - HTTP client for API testing

## File Formats

### Input Files (.txt)
- Plain text clinical cases
- UTF-8 encoding
- Benchmark-specific structure

### Output Files (.json)
- JSON arrays of option evaluations
- Must conform to benchmark schema
- Required fields: `Option`, `GradeAI`, `Rationale`

### Schema Files (.json)
- JSON Schema for response validation
- Defines required structure and types
