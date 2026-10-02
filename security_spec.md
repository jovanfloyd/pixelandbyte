# Security Specification for RubiksCube PixelandByte Firestore

## 1. Data Invariants
1. Stickers (`/stickers/{stickerId}`) must be publicly readable by all visitors (authenticated or unauthenticated) so anyone can explore the 3D Rubik's cube and navigate external links.
2. Stickers can ONLY be created or updated by verified administrators (`isAdmin()`).
3. An admin can only update the allowed fields (`title`, `imageUrl`, `linkUrl`, `updatedAt`, `updatedBy`).
4. Document IDs must adhere to the pattern `^[a-zA-Z0-9_-]+$` and max size 128 bytes.
5. Invariant fields (`id`, `face`, `row`, `col`) cannot be mutated during an update.
6. Admin documents (`/admins/{userId}`) can only be read by authenticated users, and can only be bootstrapped if the authenticated user's email matches the primary owner `jovanfloyd@gmail.com` with `email_verified == true`.

## 2. The Dirty Dozen Payloads (Designed to test boundaries)
1. **Unauthenticated Sticker Write**: Write to `/stickers/front-0-0` with no auth token. Expected: PERMISSION_DENIED.
2. **Non-Admin Sticker Update**: Write to `/stickers/front-0-0` as an arbitrary non-admin user. Expected: PERMISSION_DENIED.
3. **Invalid Face Mutation**: Attempt to change `face` from `front` to `invalid_face`. Expected: PERMISSION_DENIED.
4. **Invalid Row/Col Values**: Attempt to set `row: 5` or `col: -1`. Expected: PERMISSION_DENIED.
5. **Overly Long Title**: Attempt to write a title of 500 characters (> 120 max limit). Expected: PERMISSION_DENIED.
6. **Ghost Field Injection**: Attempt to inject `{ isHacked: true }` into a sticker document. Expected: PERMISSION_DENIED.
7. **Path Traversal / Junk ID**: Attempt to write to `/stickers/../../secret` or a 2KB document ID. Expected: PERMISSION_DENIED.
8. **Immutability Breach**: Attempt to change a sticker's `id` from `front-0-0` to `back-1-1`. Expected: PERMISSION_DENIED.
9. **Fake Admin Privilege Escalation**: An arbitrary user writes `{ role: 'admin' }` to `/admins/$(request.auth.uid)`. Expected: PERMISSION_DENIED.
10. **Unverified Email Spoofing**: User with email `jovanfloyd@gmail.com` but `email_verified: false` attempts to write admin doc. Expected: PERMISSION_DENIED.
11. **Client Timestamp Manipulation**: Sticker write with `updatedAt: "2099-01-01"` instead of `request.time`. Expected: PERMISSION_DENIED.
12. **Malicious Link Protocol Injection**: Sticker write with `linkUrl: "javascript:alert(1)"`. Expected: PERMISSION_DENIED.
