"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "fr"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translation dictionaries
const translations = {
  en: {
    // Header
    "app.title": "XML Schema Form Generator",
    "app.description": "Upload an XSD schema to generate dynamic forms and export conforming XML files",

    // Schema Selector
    "schemas.saved": "Saved Schemas",
    "schemas.noSaved": "No saved schemas yet",
    "schemas.uploadToStart": "Upload a schema to get started",
    "schemas.recentlySaved": "Recently saved",
    "schemas.deleteSchema": "Delete Schema",
    "schemas.deleteConfirm": 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    "schemas.loadingSchemas": "Loading saved schemas...",
    "schemas.renameSchema": "Rename Schema",
    "schemas.renameTitle": "Rename Schema",
    "schemas.renameDescription": "Enter a new name for the schema file",
    "schemas.newName": "New Name",
    "schemas.rename": "Rename",
    "schemas.renameSuccess": "Schema renamed successfully",
    "schemas.renameError": "Failed to rename schema",
    "schemas.renameExists": "A schema with this name already exists",

    // Schema Uploader
    "upload.newSchema": "Upload New Schema",
    "upload.description": "Upload an XSD file to parse its structure and generate a dynamic form",
    "upload.selectFile": "Upload XSD Schema File",
    "upload.validFile": "Please select a valid XSD file (.xsd or .xml extension)",
    "upload.parsing": "Parsing...",
    "upload.success": "Schema parsed successfully! You can now fill out the form below.",
    "upload.tryExamples": "Or try example schemas",
    "upload.monthlyDeclarations": "Monthly Declarations",
    "upload.monthlyDescription": "Financial monthly reporting schema with statistics and period data",
    "upload.weeklyReports": "Weekly Control Reports",
    "upload.weeklyDescription": "Weekly financial control schema with account information and discrepancy explanations",
    "upload.templateDownload":
      "Download a CSV template with the correct column headers. You can also upload Excel files (.xlsx, .xls).",

    // Dynamic Form
    "form.title": "Dynamic Form",
    "form.description":
      "Fill out the form based on your uploaded schema. The generated XML will conform to the schema structure.",
    "form.required": "Required",
    "form.generateXml": "Generate XML",
    "form.generating": "Generating...",
    "form.addItem": "Add {item}",
    "form.pattern": "Pattern: {pattern}",
    "form.format": "Format: {format}",
    "form.cdata": "CDATA",
    "form.fixErrors": "Please fix the validation errors above before generating the XML file.",
    "form.debugInfo": "Debug Info",
    // Form sections
    "form.collapse": "Collapse",
    "form.expand": "Expand",
    "form.collapseAll": "Collapse All",
    "form.expandAll": "Expand All",

    // Export functionality
    "export.title": "Export Data",
    "export.csv": "Export CSV",
    "export.excel": "Export Excel",
    "export.noData": "No data to export",
    "export.success": "Data exported successfully!",
    "export.error": "Failed to export data",
    "export.generating": "Generating export...",

    // XML Preview
    "xml.generated": "XML Generated Successfully",
    "xml.preview": "XML Preview",
    "xml.copy": "Copy",
    "xml.download": "Download",
    "xml.copied": "XML copied to clipboard!",

    // Bulk Upload
    "bulk.title": "Bulk Upload for {name}",
    "bulk.expectedColumns": "Expected Columns ({count})",
    "bulk.upload": "Upload",
    "bulk.preview": "Preview",
    "bulk.config": "CDATA ({count})",
    "bulk.cdataConfig": "CDATA Configuration",
    "bulk.cdataDescription": "Select columns to wrap in CDATA sections in the generated XML.",
    "bulk.downloadTemplate": "Download CSV Template",
    "bulk.uploadFile": "Upload CSV or Excel File",
    "bulk.supportsFiles": "Supports CSV, Excel (.xlsx, .xls) files",
    "bulk.dataPreview": "Data Preview (first {count} rows)",
    "bulk.rowsShown": "{count} rows shown",
    "bulk.processing": "Processing...",
    "bulk.import": "Import Data",
    "bulk.cancel": "Cancel",
    "bulk.selectFile": "Please select a CSV or Excel file (.csv, .xlsx, .xls)",
    "bulk.fileEmpty": "The file appears to be empty",
    "bulk.csvRequirement": "CSV file must have at least a header row and one data row",
    "bulk.excelEmpty": "Excel file appears to be empty",
    "bulk.failedProcess": "Failed to process file",
    "bulk.failedRead": "Failed to read file",
    "bulk.failedImport": "Failed to import data",
    "bulk.failedTemplate": "Failed to download template",
    "bulk.cdataReference": "CDATA Columns (for reference only):",
    "bulk.cdataNote": "These columns can be configured to use CDATA sections in the upload dialog.",

    // Validation Messages
    "validation.required": "{field} is required",
    "validation.pattern": "{field} does not match the required pattern ({pattern})",
    "validation.minLength": "{field} must be at least {min} characters",
    "validation.maxLength": "{field} must be no more than {max} characters",
    "validation.fractionDigits": "{field} can have at most {digits} decimal places",
    "validation.minValue": "{field} must be at least {min}",
    "validation.maxValue": "{field} must be at most {max}",
    "validation.integer": "{field} must be an integer",
    "validation.decimal": "{field} must be a decimal number",
    "validation.atLeastOne": "At least one {field} is required",

    // Common
    "common.delete": "Delete",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.save": "Save",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.bytes": "B",
    "common.kilobytes": "KB",
    "common.megabytes": "MB",

    // Language Switcher
    "language.switch": "Switch Language",
    "language.english": "English",
    "language.french": "Français",

    // XML Import
    "import.title": "Import Existing XML",
    "import.description": "Upload an existing XML file to pre-fill the form with its data",
    "import.selectFile": "Upload XML File",
    "import.validFile": "Please select a valid XML file (.xml extension)",
    "import.parsing": "Parsing XML...",
    "import.success": "XML data imported successfully! Form has been pre-filled with the existing values.",
    "import.error": "Failed to import XML data",
    "import.noMatch": "The uploaded XML structure doesn't match the current schema",
    "import.clearForm": "Clear Form",
    "import.confirmClear": "Are you sure you want to clear all form data? This action cannot be undone.",
  },
  fr: {
    // Header
    "app.title": "Générateur de Formulaires XML Schema",
    "app.description":
      "Téléchargez un schéma XSD pour générer des formulaires dynamiques et exporter des fichiers XML conformes",

    // Schema Selector
    "schemas.saved": "Schémas Sauvegardés",
    "schemas.noSaved": "Aucun schéma sauvegardé pour le moment",
    "schemas.uploadToStart": "Téléchargez un schéma pour commencer",
    "schemas.recentlySaved": "Récemment sauvegardé",
    "schemas.deleteSchema": "Supprimer le Schéma",
    "schemas.deleteConfirm": 'Êtes-vous sûr de vouloir supprimer "{name}" ? Cette action ne peut pas être annulée.',
    "schemas.loadingSchemas": "Chargement des schémas sauvegardés...",
    "schemas.renameSchema": "Renommer le Schéma",
    "schemas.renameTitle": "Renommer le Schéma",
    "schemas.renameDescription": "Entrez un nouveau nom pour le fichier de schéma",
    "schemas.newName": "Nouveau Nom",
    "schemas.rename": "Renommer",
    "schemas.renameSuccess": "Schéma renommé avec succès",
    "schemas.renameError": "Échec du renommage du schéma",
    "schemas.renameExists": "Un schéma avec ce nom existe déjà",

    // Schema Uploader
    "upload.newSchema": "Télécharger un Nouveau Schéma",
    "upload.description": "Téléchargez un fichier XSD pour analyser sa structure et générer un formulaire dynamique",
    "upload.selectFile": "Télécharger un Fichier de Schéma XSD",
    "upload.validFile": "Veuillez sélectionner un fichier XSD valide (extension .xsd ou .xml)",
    "upload.parsing": "Analyse en cours...",
    "upload.success": "Schéma analysé avec succès ! Vous pouvez maintenant remplir le formulaire ci-dessous.",
    "upload.tryExamples": "Ou essayez des exemples de schémas",
    "upload.monthlyDeclarations": "Déclarations Mensuelles",
    "upload.monthlyDescription": "Schéma de rapport mensuel financier avec statistiques et données de période",
    "upload.weeklyReports": "Rapports de Contrôle Hebdomadaires",
    "upload.weeklyDescription":
      "Schéma de contrôle financier hebdomadaire avec informations de compte et explications d'écarts",
    "upload.templateDownload":
      "Téléchargez un modèle CSV avec les en-têtes de colonnes corrects. Vous pouvez également télécharger des fichiers Excel (.xlsx, .xls).",

    // Dynamic Form
    "form.title": "Formulaire Dynamique",
    "form.description":
      "Remplissez le formulaire basé sur votre schéma téléchargé. Le XML généré sera conforme à la structure du schéma.",
    "form.required": "Obligatoire",
    "form.generateXml": "Générer XML",
    "form.generating": "Génération...",
    "form.addItem": "Ajouter {item}",
    "form.pattern": "Motif : {pattern}",
    "form.format": "Format : {format}",
    "form.cdata": "CDATA",
    "form.fixErrors": "Veuillez corriger les erreurs de validation ci-dessus avant de générer le fichier XML.",
    "form.debugInfo": "Info de Débogage",
    // Form sections
    "form.collapse": "Réduire",
    "form.expand": "Développer",
    "form.collapseAll": "Tout Réduire",
    "form.expandAll": "Tout Développer",

    // Export functionality
    "export.title": "Exporter les Données",
    "export.csv": "Exporter CSV",
    "export.excel": "Exporter Excel",
    "export.noData": "Aucune donnée à exporter",
    "export.success": "Données exportées avec succès !",
    "export.error": "Échec de l'exportation des données",
    "export.generating": "Génération de l'export...",

    // XML Preview
    "xml.generated": "XML Généré avec Succès",
    "xml.preview": "Aperçu XML",
    "xml.copy": "Copier",
    "xml.download": "Télécharger",
    "xml.copied": "XML copié dans le presse-papiers !",

    // Bulk Upload
    "bulk.title": "Téléchargement en Lot pour {name}",
    "bulk.expectedColumns": "Colonnes Attendues ({count})",
    "bulk.upload": "Télécharger",
    "bulk.preview": "Aperçu",
    "bulk.config": "CDATA ({count})",
    "bulk.cdataConfig": "Configuration CDATA",
    "bulk.cdataDescription": "Sélectionnez les colonnes à encapsuler dans des sections CDATA dans le XML généré.",
    "bulk.downloadTemplate": "Télécharger le Modèle CSV",
    "bulk.uploadFile": "Télécharger un Fichier CSV ou Excel",
    "bulk.supportsFiles": "Supporte les fichiers CSV, Excel (.xlsx, .xls)",
    "bulk.dataPreview": "Aperçu des Données (premières {count} lignes)",
    "bulk.rowsShown": "{count} lignes affichées",
    "bulk.processing": "Traitement...",
    "bulk.import": "Importer les Données",
    "bulk.cancel": "Annuler",
    "bulk.selectFile": "Veuillez sélectionner un fichier CSV ou Excel (.csv, .xlsx, .xls)",
    "bulk.fileEmpty": "Le fichier semble être vide",
    "bulk.csvRequirement": "Le fichier CSV doit avoir au moins une ligne d'en-tête et une ligne de données",
    "bulk.excelEmpty": "Le fichier Excel semble être vide",
    "bulk.failedProcess": "Échec du traitement du fichier",
    "bulk.failedRead": "Échec de la lecture du fichier",
    "bulk.failedImport": "Échec de l'importation des données",
    "bulk.failedTemplate": "Échec du téléchargement du modèle",
    "bulk.cdataReference": "Colonnes CDATA (pour référence seulement) :",
    "bulk.cdataNote":
      "Ces colonnes peuvent être configurées pour utiliser des sections CDATA dans la boîte de dialogue de téléchargement.",

    // Validation Messages
    "validation.required": "{field} est obligatoire",
    "validation.pattern": "{field} ne correspond pas au motif requis ({pattern})",
    "validation.minLength": "{field} doit contenir au moins {min} caractères",
    "validation.maxLength": "{field} ne doit pas dépasser {max} caractères",
    "validation.fractionDigits": "{field} peut avoir au maximum {digits} décimales",
    "validation.minValue": "{field} doit être au moins {min}",
    "validation.maxValue": "{field} doit être au maximum {max}",
    "validation.integer": "{field} doit être un entier",
    "validation.decimal": "{field} doit être un nombre décimal",
    "validation.atLeastOne": "Au moins un {field} est requis",

    // Common
    "common.delete": "Supprimer",
    "common.cancel": "Annuler",
    "common.close": "Fermer",
    "common.save": "Sauvegarder",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
    "common.bytes": "o",
    "common.kilobytes": "Ko",
    "common.megabytes": "Mo",

    // Language Switcher
    "language.switch": "Changer de Langue",
    "language.english": "English",
    "language.french": "Français",

    // XML Import
    "import.title": "Importer un XML Existant",
    "import.description": "Téléchargez un fichier XML existant pour pré-remplir le formulaire avec ses données",
    "import.selectFile": "Télécharger un Fichier XML",
    "import.validFile": "Veuillez sélectionner un fichier XML valide (extension .xml)",
    "import.parsing": "Analyse du XML...",
    "import.success": "Données XML importées avec succès ! Le formulaire a été pré-rempli avec les valeurs existantes.",
    "import.error": "Échec de l'importation des données XML",
    "import.noMatch": "La structure du XML téléchargé ne correspond pas au schéma actuel",
    "import.clearForm": "Vider le Formulaire",
    "import.confirmClear":
      "Êtes-vous sûr de vouloir vider toutes les données du formulaire ? Cette action ne peut pas être annulée.",
  },
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "fr")) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("language", language)
  }, [language])

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language][key as keyof (typeof translations)[typeof language]] || key

    // Replace parameters in the translation
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue))
      })
    }

    return translation
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
