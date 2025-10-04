(define-constant ERR_HASH_EXISTS (err u100))
(define-constant ERR_INVALID_HASH (err u101))
(define-constant ERR_NOT_AUTHORIZED (err u102))
(define-constant ERR_INVALID_TITLE (err u103))
(define-constant ERR_INVALID_DESCRIPTION (err u104))
(define-constant ERR_TOO_MANY_CO_AUTHORS (err u105))
(define-constant ERR_INVALID_CO_AUTHOR (err u106))
(define-constant ERR_DATASET_NOT_FOUND (err u107))
(define-constant ERR_ALREADY_REGISTERED (err u108))
(define-constant ERR_INVALID_TIMESTAMP (err u109))
(define-constant ERR_NO_PERMISSION (err u110))
(define-constant ERR_INVALID_METADATA (err u111))
(define-constant ERR_MAX_DATASETS_EXCEEDED (err u112))
(define-constant ERR_INVALID_CATEGORY (err u113))
(define-constant ERR_INVALID_TAGS (err u114))
(define-constant ERR_INVALID_LICENSE (err u115))
(define-constant ERR_FEE_REQUIRED (err u116))
(define-constant ERR_INSUFFICIENT_FEE (err u117))
(define-constant ERR_INVALID_STATUS (err u118))
(define-constant ERR_UPDATE_NOT_ALLOWED (err u119))
(define-constant ERR_INVALID_UPDATE_PARAM (err u120))

(define-data-var next-dataset-id uint u0)
(define-data-var max-datasets uint u10000)
(define-data-var registration-fee uint u500)
(define-data-var admin-principal principal tx-sender)

(define-map Datasets
  { data-hash: (buff 32) }
  {
    id: uint,
    title: (string-ascii 100),
    description: (string-utf8 500),
    owner: principal,
    co-authors: (list 10 principal),
    timestamp: uint,
    category: (string-ascii 50),
    tags: (list 20 (string-ascii 30)),
    license: (string-ascii 50),
    status: bool,
    metadata: (optional (buff 1024))
  }
)

(define-map DatasetIds
  uint
  { data-hash: (buff 32) }
)

(define-map DatasetUpdates
  uint
  {
    updated-title: (string-ascii 100),
    updated-description: (string-utf8 500),
    updated-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-dataset (hash (buff 32)))
  (map-get? Datasets { data-hash: hash })
)

(define-read-only (get-dataset-by-id (id uint))
  (let ((hash (get data-hash (map-get? DatasetIds id))))
    (match hash h (get-dataset h) none)
  )
)

(define-read-only (get-dataset-update (id uint))
  (map-get? DatasetUpdates id)
)

(define-read-only (is-dataset-registered (hash (buff 32)))
  (is-some (map-get? Datasets { data-hash: hash }))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR_INVALID_HASH))
)

(define-private (validate-title (title (string-ascii 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR_INVALID_TITLE))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (<= (len desc) u500)
      (ok true)
      (err ERR_INVALID_DESCRIPTION))
)

(define-private (validate-co-authors (authors (list 10 principal)))
  (if (<= (len authors) u10)
      (ok true)
      (err ERR_TOO_MANY_CO_AUTHORS))
)

(define-private (validate-category (cat (string-ascii 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR_INVALID_CATEGORY))
)

(define-private (validate-tags (tags (list 20 (string-ascii 30))))
  (if (fold and-fold (map validate-tag tags) true)
      (ok true)
      (err ERR_INVALID_TAGS))
)

(define-private (validate-tag (tag (string-ascii 30)))
  (and (> (len tag) u0) (<= (len tag) u30))
)

(define-private (validate-license (lic (string-ascii 50)))
  (if (or (is-eq lic "CC-BY") (is-eq lic "MIT") (is-eq lic "GPL") (is-eq lic "Public Domain"))
      (ok true)
      (err ERR_INVALID_LICENSE))
)

(define-private (validate-metadata (meta (optional (buff 1024))))
  (match meta m (if (<= (len m) u1024) (ok true) (err ERR_INVALID_METADATA)) (ok true))
)

(define-private (validate-fee (amount uint))
  (if (>= amount (var-get registration-fee))
      (ok true)
      (err ERR_INSUFFICIENT_FEE))
)

(define-private (and-fold (a bool) (b bool))
  (and a b)
)

(define-public (set-admin (new-admin principal))
  (if (is-eq tx-sender (var-get admin-principal))
      (begin
        (var-set admin-principal new-admin)
        (ok true)
      )
      (err ERR_NOT_AUTHORIZED)
  )
)

(define-public (set-max-datasets (new-max uint))
  (if (is-eq tx-sender (var-get admin-principal))
      (begin
        (var-set max-datasets new-max)
        (ok true)
      )
      (err ERR_NOT_AUTHORIZED)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (if (is-eq tx-sender (var-get admin-principal))
      (begin
        (var-set registration-fee new-fee)
        (ok true)
      )
      (err ERR_NOT_AUTHORIZED)
  )
)

(define-public (register-dataset
  (data-hash (buff 32))
  (title (string-ascii 100))
  (description (string-utf8 500))
  (co-authors (list 10 principal))
  (category (string-ascii 50))
  (tags (list 20 (string-ascii 30)))
  (license (string-ascii 50))
  (metadata (optional (buff 1024)))
)
  (let ((next-id (var-get next-dataset-id)))
    (try! (validate-hash data-hash))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-co-authors co-authors))
    (try! (validate-category category))
    (try! (validate-tags tags))
    (try! (validate-license license))
    (try! (validate-metadata metadata))
    (asserts! (< next-id (var-get max-datasets)) (err ERR_MAX_DATASETS_EXCEEDED))
    (asserts! (not (is-dataset-registered data-hash)) (err ERR_HASH_EXISTS))
    (try! (stx-transfer? (var-get registration-fee) tx-sender (var-get admin-principal)))
    (map-set Datasets { data-hash: data-hash }
      {
        id: next-id,
        title: title,
        description: description,
        owner: tx-sender,
        co-authors: co-authors,
        timestamp: block-height,
        category: category,
        tags: tags,
        license: license,
        status: true,
        metadata: metadata
      }
    )
    (map-set DatasetIds next-id { data-hash: data-hash })
    (var-set next-dataset-id (+ next-id u1))
    (print { event: "dataset-registered", id: next-id, hash: data-hash })
    (ok next-id)
  )
)

(define-public (update-dataset
  (data-hash (buff 32))
  (new-title (string-ascii 100))
  (new-description (string-utf8 500))
)
  (let ((dataset (map-get? Datasets { data-hash: data-hash })))
    (match dataset d
      (begin
        (asserts! (is-eq (get owner d) tx-sender) (err ERR_NO_PERMISSION))
        (try! (validate-title new-title))
        (try! (validate-description new-description))
        (map-set Datasets { data-hash: data-hash }
          (merge d
            {
              title: new-title,
              description: new-description,
              timestamp: block-height
            }
          )
        )
        (map-set DatasetUpdates (get id d)
          {
            updated-title: new-title,
            updated-description: new-description,
            updated-timestamp: block-height,
            updater: tx-sender
          }
        )
        (print { event: "dataset-updated", hash: data-hash })
        (ok true)
      )
      (err ERR_DATASET_NOT_FOUND)
    )
  )
)

(define-public (deactivate-dataset (data-hash (buff 32)))
  (let ((dataset (map-get? Datasets { data-hash: data-hash })))
    (match dataset d
      (begin
        (asserts! (is-eq (get owner d) tx-sender) (err ERR_NO_PERMISSION))
        (map-set Datasets { data-hash: data-hash } (merge d { status: false }))
        (print { event: "dataset-deactivated", hash: data-hash })
        (ok true)
      )
      (err ERR_DATASET_NOT_FOUND)
    )
  )
)

(define-public (get-dataset-count)
  (ok (var-get next-dataset-id))
)