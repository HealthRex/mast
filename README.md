# Medical AI Superintelligence Test (MAST) Leaderboard
## Overview

MAST (Medical AI Superintelligence Test) is a suite of clinically realistic benchmarks to evaluate real-world medical capabilities of artificial intelligence models. The system provides a leaderboard where AI models submit API endpoints that are automatically tested against standardized medical scenarios. 

The live leaderboard is available at [bench.arise-ai.org](https://bench.arise-ai.org).

This repository provides instructions and test files to validate your custom model API endpoint. After passing validation, view the [Submission Agreement](docs/submission_agreement.md) and submit the [Registration Form](https://forms.gle/4exSPLbsmWjNmMRQ7) for review by the MAST team. The API and token are used only for benchmark execution and are not stored after evaluation.

## How It Works

1. **Submitters** provide a single API endpoint with authentication token
2. **Leaderboard** runs automated tests against all benchmarks using that endpoint
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

2. **Set up your API endpoint** provide a hosted endpoint for accessing and benchmarking your model.

3. **Configure your endpoint** by copying and editing the config:
```bash
cp scripts/config.example.json scripts/config.json
# Edit scripts/config.json with your API details
```

4. **Test your endpoint:**
```bash
python scripts/validate_all.py
```

## API Request Format

Each benchmark makes HTTPS POST requests with:

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

### First Do NOHARM Benchmark

- **Study**: https://arxiv.org/abs/2512.01241
- **Task**: Provide complete and appropriate medical recommendations for a medical case
- **Input**: Real medical case questions posed by generalist physicians
- **Output**: Appropriateness ratings for numerous plausible options
- **Validation**: Format compliance (schema validation only)

## Validation Results

All API responses are saved for auditability:

- **`test_XXX_response.json`**: Complete API response with metadata
- **`test_XXX_validation.json`**: Validation results and error details

## Prerequisites
### Python Dependencies
Install required packages:
```bash
pip install jsonschema requests
```

### API Requirements
- **Stable endpoint**: API must remain accessible for at least 72 hours during benchmarking
- **Concurrent requests**: Must support 5-10 simultaneous connections
- **Authentication**: Bearer token authentication required
- **Response time**: Under 300 seconds per request
- **Response format**: Valid JSON array output

### Resource Requirements

#### Estimated Token Usage
- Input tokens: ~6 million
- Output tokens: ~15-25 million (varies with reasoning depth)

#### Estimated Costs
Approximate costs of widely-used models for a full benchmark run
- DeepSeek R1: ~$150
- OpenAI GPT-5: ~$250
- Claude Sonnet 4.5: ~$400
- Gemini 3 Pro: ~$500

*Costs are approximate and depend on your provider's current pricing.*

## File Formats

### Input Files (.txt)
- Plain text clinical cases
- UTF-8 encoding
- Benchmark-specific structure

### Output Files (.json)
- JSON arrays of option evaluations
- Must conform to benchmark schema

### Schema Files (.json)
- JSON schemas for response validation
- Defines required structure and types
