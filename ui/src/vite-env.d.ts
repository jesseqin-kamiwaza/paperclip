/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUC_MODE?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
