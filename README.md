# TextGuard

TextGuard is an explainable document-similarity workspace. It compares uploaded
text documents in the browser, reports verified matching passages, and exposes
the data structures and algorithms used by the comparison engine.

The project is intentionally algorithm-first: results are based on normalized
word sequences and exact, verified consecutive windows rather than an opaque
machine-learning score. Similarity measurements describe textual overlap only;
they are not a determination of plagiarism, authorship, intent, or legal
infringement.

## What TextGuard does

- Accepts `.txt` and `.md` files through file selection or drag and drop.
- Reads document contents locally in the browser.
- Compares one selected pair or every unordered pair of uploaded documents.
- Finds exact matching word windows with a configurable minimum phrase length.
- Highlights matching passages at their original character offsets.
- Reports directional document coverage, shared passage coverage, shared
  vocabulary, repeated fragments, and algorithm execution time.
- Keeps uploaded documents, comparison reports, and detection history in the
  current browser session.
- Provides an interactive explanation of the hash table, trie, token array, and
  Rabin-Karp implementations.
- Provides secure AppDeploy sign-in and a profile page without handling
  passwords in the application.

## Main functionality

### 1. Secure sign-in

The application starts at `AuthGate` when there is no authenticated AppDeploy
session. The sign-in action uses the configured AppDeploy identity provider with
OpenID Connect scopes for identity, email, profile, and offline access.

Authentication and account recovery remain with the identity provider.
TextGuard does not store or process user passwords. Authentication errors such
as blocked browser storage and navigation timeouts are surfaced to the user
with actionable messages.

### 2. Overview dashboard

The Overview page provides a workspace summary:

- total documents in the dashboard data source;
- total comparisons;
- average similarity;
- high-similarity match count;
- distribution across low (`0-20%`), moderate (`21-40%`), high
  (`41-70%`), and very high (`71-100%`) ranges;
- shortcuts to upload and compare documents.

The dashboard API currently returns an empty persistent document/comparison
dataset. The interactive upload and comparison workspace is intentionally
session-local in the browser.

### 3. Document upload and library

The Upload Documents page supports multiple files and drag-and-drop input.
Each file is validated before it enters the workspace:

- supported extensions: `.txt` and `.md`;
- empty files are rejected;
- files containing no readable text are rejected;
- maximum size: 5 MB per file;
- duplicate files are rejected using lower-cased name, size, and last-modified
  timestamp.

For each accepted file, TextGuard records its name, type, byte size, original
text, word count, character count, upload timestamp, and a generated ID. The
Document Library displays the current session's files and allows individual
documents to be removed.

No uploaded document is sent to the comparison backend. File contents are
read with the browser `File` API and retained in `sessionStorage` as part of
the current workspace snapshot.

### 4. Similarity checker

The Similarity Checker supports two modes:

- **Pair comparison**: compare one selected document against another.
- **Compare all**: compare every unordered document pair exactly once.

The phrase window controls the minimum number of consecutive normalized words
required for an exact match. A match is accepted only after the rolling-hash
candidate has been verified word by word, which prevents hash collisions from
becoming false positives.

The checker measures the execution time around the TypeScript comparison call
and presents the actual engine result. Overlapping windows are merged only
when they belong to the same alignment diagonal, and matched token positions
are deduplicated before coverage percentages are calculated.

### 5. Comparison results

Comparison Results provides a report for each completed pair:

- similarity for Document A;
- similarity for Document B;
- combined shared-passage coverage;
- number of verified matching passage groups;
- matched token counts and algorithm metrics;
- repeated shared fragments and their occurrence counts;
- the most significant matching passages, ranked by matching word count.

The side-by-side source view preserves original text. Matching intervals use
the original character offsets produced during tokenization, so punctuation,
whitespace, and headings outside the match remain visible.

Highlights use three visual levels:

- yellow: a normal verified matching passage;
- orange: a passage associated with a repeated fragment;
- red: a passage covering at least 70% of the smaller document.

Highlights can be hidden, and the passage controls navigate between matching
locations in both documents.

### 6. Detection history

Completed comparisons are recorded in the current workspace session with their
document names, score, timestamp, and status. History is not a permanent
server-side audit log. Closing the browser session or clearing session storage
removes the local workspace snapshot.

### 7. Algorithm analysis

The Algorithm Analysis page is an interactive teaching and diagnostics view.
It uses the same implementations as the comparison engine rather than
simulated examples.

#### Tokenization and preprocessing

`tokenizeDocument` scans Unicode letters and numbers, including apostrophes
inside words. Tokens are lower-cased and assigned:

- a normalized value;
- a zero-based token index;
- an original source start offset;
- an original source end offset.

This gives the engine normalized comparisons while preserving accurate source
locations for highlighting. Tokenization is `O(n)` over source characters and
uses `O(t)` space for `t` tokens.

#### Hash table

`HashTable` is a separate-chaining hash table. It stores fixed-size fragments
and their occurrences in each document. The table supports insertion, lookup,
membership testing, deletion, enumeration, and occurrence accumulation.

Average `set`, `get`, and `delete` operations are `O(1)`; the worst case is
`O(n)` when many keys share a bucket.

#### Trie

`Trie` stores the vocabulary character by character. It supports:

- exact word lookup;
- document IDs and token positions for a word;
- prefix search with a result limit;
- a read-only tree snapshot for visualization;
- shared vocabulary lookup between two documents.

Insertion and exact lookup are `O(L)` for word length `L`. Prefix search is
`O(P + K)` for prefix length `P` and `K` returned words.

#### Rabin-Karp rolling hash

`rabinKarpWordMatches` hashes fixed-size token windows with a rolling hash.
Document B is indexed by window hash, then each window in Document A is
looked up. Every hash candidate is verified with exact token comparison.

Rolling a window is `O(1)`. Expected matching work is approximately
`O(n + m + c*w)`, where `c` is the number of equal-hash candidates and `w` is
the window size. The worst case is `O(n*m*w)`. The implementation uses a
modulus chosen to keep arithmetic within JavaScript's safe integer range.

The page also exposes a per-window trace showing the window hash, pattern hash,
whether the hashes match, and whether exact verification succeeded.

#### Comparison engine

`compareDocuments` combines all structures:

1. Tokenize both source documents.
2. Insert every token into a shared trie with document and position metadata.
3. Store every eligible fixed-size fragment in the hash table.
4. Find exact matching windows with Rabin-Karp.
5. Union all matched token positions so overlapping windows are not counted
   twice.
6. Merge overlapping windows on the same A/B alignment diagonal into passages.
7. Convert token ranges back to original character offsets.
8. Calculate directional coverage, shared vocabulary, Dice similarity, repeated
   fragments, and algorithm metrics.

`compareAllDocuments` compares each unordered pair once. For `d` documents,
that is `d * (d - 1) / 2` comparisons, or `O(d^2)` pairwise calls before the
cost of comparing document contents.

## Understanding the metrics

### Directional similarity

For each document:

```text
similarityA = matched token positions in A / total tokens in A * 100
similarityB = matched token positions in B / total tokens in B * 100
```

The two values can differ when one document contains additional unmatched
content.

### Shared passage coverage

The results UI combines matched positions from A and B and divides by the
total word count of both documents. It is a view-level summary and should not
be confused with either directional similarity.

### Dice similarity

Dice similarity is calculated over unique normalized vocabulary:

```text
2 * shared unique tokens / (unique tokens in A + unique tokens in B) * 100
```

It measures shared vocabulary, not word order or repeated passages. It is not
a plagiarism score.

### Repeated fragments

The hash table records how often each fixed-size phrase occurs in each
document. A shared phrase with more than one occurrence in either document is
available to the results view as a repeated fragment.

## Application architecture

```text
src/main.tsx
  -> App.tsx
      -> AuthGate.tsx
      -> Sidebar.tsx / Topbar.tsx
      -> UploadModule.tsx
      -> SimilarityChecker.tsx
          -> algorithms/engine.ts
              -> preprocessing.ts
              -> rabinKarp.ts
              -> hashTable.ts
              -> trie.ts
      -> ComparisonResults.tsx
      -> AlgorithmAnalysis.tsx
      -> DetectionHistory.tsx
      -> ProfilePage.tsx

backend/index.ts
  -> AppDeploy router and authentication middleware
  -> project status endpoint
  -> dashboard endpoint
  -> profile read/update endpoints
```

### Frontend state

`App.tsx` owns the current section, uploaded documents, comparison runs,
history entries, and selected report. These values are serialized under the
`textguard-workspace-session-v1` session-storage key. A malformed or unavailable
snapshot safely starts an empty workspace.

### Backend endpoints

The AppDeploy backend exposes:

| Method | Route | Authentication | Purpose |
|---|---|---:|---|
| `GET` | `/api/project/status` | No | Reports service readiness and engine/authentication mode |
| `GET` | `/api/dashboard` | Yes | Returns dashboard document, comparison, and statistic data |
| `GET` | `/api/profile` | Yes | Creates or retrieves the signed-in user's profile |
| `PUT` | `/api/profile` | Yes | Validates and updates a profile name |

Profile records are stored in the `textguard_profiles` AppDeploy database table.
Names must contain between 2 and 80 characters after trimming.

## Project structure

```text
TextGuard/
├── README.md
├── build_manifest/
│   ├── build-manifest.json
│   └── sbom.cdx.json
└── source/
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── backend/
    │   ├── index.ts
    │   ├── realtime.ts
    │   └── realtime-subscribers.ts
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── index.css
    │   ├── algorithms/
    │   │   ├── engine.ts
    │   │   ├── hashTable.ts
    │   │   ├── preprocessing.ts
    │   │   ├── rabinKarp.ts
    │   │   └── trie.ts
    │   └── components/
    └── tests/
        ├── algorithms.test.ts
        └── tests.json
```

## Requirements

- Node.js with npm
- A browser with JavaScript enabled
- AppDeploy configuration for authenticated/profile functionality

## Installation and local development

From the repository root:

```powershell
cd source
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

Create a production build:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

Run the algorithm test suite:

```powershell
npm test
```

The test suite covers collision handling, fragment occurrences, trie search
and prefixes, Unicode-aware tokenization, rolling-hash verification, empty
documents, directional coverage, repeated windows, original source offsets,
and pairwise comparison counts.

## Limitations and responsible interpretation

- Only plain text and Markdown are supported. PDF, DOCX, image, and scanned
  documents are not parsed.
- The 5 MB limit applies to each uploaded file.
- Comparisons require consecutive normalized word windows. Semantically
  equivalent rewrites, translations, paraphrases, and reordered text may not
  match.
- Case and punctuation differences are normalized for matching; punctuation
  and whitespace are retained only for source display and offsets.
- The comparison process is pairwise and grows quadratically with the number
  of documents.
- Workspace uploads, reports, and history are session-local and are not a
  durable cloud archive.
- Similarity is evidence of textual overlap, not a standalone academic,
  employment, legal, or disciplinary decision.

## Technology stack

- React 19 and React DOM
- TypeScript
- Vite
- Tailwind CSS and PostCSS
- Lucide React icons
- Vitest
- AppDeploy client/server SDK for authentication, routing, and profile data

## License

No license file is currently included in this repository. Add a project
license before distributing TextGuard outside its intended development or
deployment environment.
