import { createContext, useContext } from "react";
import type { PublicSettings } from "../types";

export const SettingsContext = createContext<PublicSettings>({ contact_whatsapp: null, contact_call: null, facebook_page_url: null });

export function useSettings(): PublicSettings {
  return useContext(SettingsContext);
}
