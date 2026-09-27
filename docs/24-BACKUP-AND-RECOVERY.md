# 24-BACKUP-AND-RECOVERY.md

## 1. Database Backups

- Supabase provides automated daily backups on paid tiers; the free tier's backup retention is limited or may not include point-in-time recovery — verify current Supabase free-tier backup behavior at implementation time, since this directly affects risk tolerance for staying on the free tier once real customer/order data exists.
- **Recommendation**: even while on Supabase's free tier for cost reasons, treat upgrading to a tier with reliable automated backups as a near-term priority once the platform holds real orders/payments/customer data — losing order history or payment records is a business-critical risk, not just a technical inconvenience. This is one of the few areas where the "free-tier-first" principle should yield quickly to reliability once real money is flowing through the system.
- **Supplementary backup**: regardless of Supabase's own backup tier, schedule an independent periodic export (e.g., a nightly `pg_dump` via a scheduled GitHub Action or the backend host's cron capability, storing the dump in a separate storage location such as a private cloud storage bucket or even encrypted and committed to a private backup location) as a second layer of protection against provider-side incidents, not just accidental deletes.

## 2. Storage (Images) Backups

- Product/banner/hamper images in Supabase Storage are treated as re-uploadable business assets rather than irreplaceable transactional data; a lower backup priority than the database, but a periodic sync of the storage bucket to another location is a reasonable low-effort safeguard once volume is low (a handful of GB), especially before any bulk edits.

## 3. Configuration & Secrets Backup

- Environment variable values (the actual secrets, not just names) should be kept in a secure password manager or the team's secret-management tool, separate from the hosting platform, so a platform account issue doesn't strand the team without access to its own Razorpay/Firebase/Resend credentials.
- The mobile app's signing keystore (if not using EAS-managed credentials) must be backed up securely — losing it prevents future updates to an already-published Play Store app.

## 4. Disaster Recovery Plan (Minimum Viable)

1. **Database loss/corruption**: restore from the most recent Supabase backup (or the supplementary `pg_dump`) into a new/same Supabase project; update `DATABASE_URL` if the project changed; run any migrations applied since the backup was taken, if tracked separately.
2. **Backend hosting outage**: redeploy the same Docker image to an alternate free/low-cost host (keeping the Dockerfile portable, per `16-DEPLOYMENT.md` §4, is what makes this possible without a rewrite); update DNS/`NEXT_PUBLIC_API_BASE_URL` accordingly.
3. **Web hosting outage (Vercel)**: Next.js apps are portable to other Node hosting if absolutely necessary, though this is a low-likelihood scenario for Vercel specifically; documented here for completeness rather than as an expected event.
4. **Accidental data deletion by an admin**: soft-delete flags (`05-DATABASE-SCHEMA.md` §3) prevent most accidental permanent loss for products/categories/coupons/addresses; for anything hard-deleted, the most recent backup is the recovery path.
5. **Compromised secret**: rotate immediately per `08-SECURITY.md` §12/§14 note in `18-ENVIRONMENT-VARIABLES.md` §5.

## 5. Recovery Time / Point Objectives (informal, V1 scale)

- Given the business's current scale, a formal RTO/RPO SLA is not required, but a working assumption should be documented: acceptable data loss window of "up to the last nightly backup" (RPO ≈ 24h) and acceptable downtime of a few hours for a full recovery (RTO ≈ a few hours), revisited as the business grows and expectations tighten (see `25-FUTURE-ROADMAP.md` for when to invest further here).

## 6. Testing the Backup

- Periodically (e.g., quarterly, or before any major migration) perform a test restore of the latest backup into a scratch environment to confirm the backup is actually usable — an untested backup is not a reliable backup.
