# Benchmark Descriptions

This document provides detailed descriptions of all benchmarks in the MAST leaderboard.

## First, Do NOHARM Benchmark

### Purpose
NOHARM is a physician-validated medical benchmark to evaluate the accuracy and safety of AI-generated medical recommendations, grounded in real medical cases. The current version covers 10 specialties across 100 cases, and includes 12,747 specialist annotations on beneficial and harmful medical actions that can be taken in the 100 cases. This project is led and supported by the ARISE AI Research Network, based at Stanford and Harvard. 

Read our [study](https://arxiv.org/abs/2512.01241) for more details.
See the live [leaderboard](https://bench.arise-ai.org/) for current rankings. 

### Input Format
- **File type:** Plain text (.txt)
- **Content:** [TODO: describe the input structure]
- **Encoding:** UTF-8

### Output Format
- **File type:** JSON (.json)
- **Schema:** Defined in `benchmarks/noharm/schema.json`
- **Required fields:** `result`
- **Optional fields:** `metadata.confidence`, `metadata.processing_time`

### Test Cases
Currently includes:
- `test_001`: minimal example case as described in the study (see link above)

### Validation Process
**Schema Validation:** Output must conform to the benchmark's JSON schema

### File Naming Conventions
- Input files: `test_001.txt`, `test_002.txt`, etc.
- Output files: `test_001.json`, `test_002.json`, etc.
- Sequential numbering maintains input-output correspondence

## Adding New Benchmarks
When adding new benchmarks:

1. Follow the established directory structure
2. Create comprehensive documentation in `prompt.md`
3. Define clear validation criteria in `schema.json`
4. Implement robust validation in `validator.py`
5. Include diverse test cases covering edge cases
6. Update this document with benchmark details

See [contributing.md](contributing.md) for detailed instructions on adding benchmarks.
