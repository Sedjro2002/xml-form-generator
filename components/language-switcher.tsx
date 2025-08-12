"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          {language === "en" ? "EN" : "FR"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-blue-50" : ""}>
          {t("language.english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("fr")} className={language === "fr" ? "bg-blue-50" : ""}>
          {t("language.french")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
