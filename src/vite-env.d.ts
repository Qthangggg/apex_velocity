interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_BANK_NAME?: string;
  readonly VITE_BANK_ACCOUNT_NUMBER?: string;
  readonly VITE_BANK_ACCOUNT_HOLDER?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
