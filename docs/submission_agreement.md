# Medical AI Superintelligence Test (MAST)  
## Submission Agreement

---

## Section 1. Submission Process

1. Review this document in its entirety.
2. If you are submitting a custom model, please review all instructions on this GitHub repository to validate your API endpoint.
3. Fill out the [Registration Form](https://forms.gle/6KC3oPhG6mFGjCVc9) and agree to the terms of use.
4. We will review and verify your submission.
5. If verified, your model will be evaluated on the private test set for each benchmark.
6. Results will be reviewed by the MAST team for approval.
7. If approved, results will be permanently indexed on the public leaderboard.

---

## Section 2. Registration

All submissions are subject to a review process at the discretion of the MAST team to ensure responsible, ethical, and fair use of the benchmark. Submission of the registration form does **not** guarantee acceptance or publication on the leaderboard. See above for the link to the Registration Form.

---

## Section 3. Submission Requirements

- Models not publicly available via common inference aggregators (e.g., OpenRouter) must provide a **stable custom API endpoint** for MAST evaluation. Submitting organizations are responsible for ensuring endpoint availability, correctness, and compliance with the expected input/output schema throughout the evaluation period.

- Models evaluated via custom API endpoints must operate in a **zero data-retention mode**. Submitting organizations must **not store, log, cache, reuse, or train on** any inputs, prompts, or outputs generated during MAST evaluation.

- Submitting organizations must follow the instructions and test examples provided in the GitHub repository to ensure their endpoint correctly handles the expected inputs and outputs.

- Submitting organizations are responsible for **token costs** incurred during evaluation. Estimated token usage and evaluation parameters are provided for reference and may vary.

- Organizations are limited to **one (1) set of submissions per week**.

- All results will be **manually inspected and verified** by the MAST team prior to public indexing on the leaderboard.

- The MAST team retains **final authority** over verification decisions.

- All verified and non-disqualified results will be posted publicly to the leaderboard. Once submitted and evaluated, model scores are **final**, will be made public, and **cannot be revoked or withdrawn** at the request of the submitting organization.

- To discourage overfitting and repeated probing of the benchmark, the total number of submission attempts will be displayed publicly alongside the score, as well as the date of submission.

- The MAST team reserves the right to **disqualify any submission** made in bad faith or exhibiting suspicious activity, including but not limited to attempts at benchmark reconstruction, prompt leakage, coordinated probing, or violations of the Terms of Use.

---

## Terms of Use

Participation in MAST is conditioned on agreement to responsible use of the benchmark. Submitting organizations agree **not** to attempt to reverse engineer, reconstruct, or infer the contents of the private test sets, nor to game or manipulate the evaluation process.

Violations of this policy will result in **immediate disqualification** and **permanent removal** of the organization from all current and future MAST submissions, at the sole discretion of the MAST team. Additionally, we reserve the right to pursue legal action.

All decisions regarding verification, scoring, disqualification, and leaderboard inclusion are **final and non-appealable**.

---

_Last modified on December 23rd, 2025._
