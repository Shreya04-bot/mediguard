import React, { createContext, useContext, useState } from "react";

const translations = {
  en: {
    welcome: "Welcome back",
    dashboard: "Dashboard",
    predict: "Predict Risk",
    ocr: "Parse Lab Report",
    chat: "Symptom Assistant",
    ayurveda: "Ayurvedic Care",
    profile: "Profile",
    settings: "Settings",
    logout: "Log Out",
    switchRole: "Switch Role",
    notifications: "Notifications",
  },
  es: {
    welcome: "Bienvenido de nuevo",
    dashboard: "Panel Control",
    predict: "Predecir Riesgo",
    ocr: "Analizar Laboratorio",
    chat: "Asistente Síntomas",
    ayurveda: "Cuidado Ayurvédico",
    profile: "Perfil",
    settings: "Configuración",
    logout: "Cerrar Sesión",
    switchRole: "Cambiar Rol",
    notifications: "Notificaciones",
  },
  hi: {
    welcome: "पुनः स्वागत है",
    dashboard: "डैशबोर्ड",
    predict: "जोखिम का अनुमान",
    ocr: "लैब रिपोर्ट विश्लेषण",
    chat: "लक्षण सहायक",
    ayurveda: "आयुर्वेद देखभाल",
    profile: "प्रोफ़ाइल",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",
    switchRole: "भूमिका बदलें",
    notifications: "सूचनाएं",
  },
  fr: {
    welcome: "Bon retour",
    dashboard: "Tableau de bord",
    predict: "Prédire le risque",
    ocr: "Analyse de rapport",
    chat: "Assistant de symptômes",
    ayurveda: "Soins ayurvédiques",
    profile: "Profil",
    settings: "Paramètres",
    logout: "Déconnexion",
    switchRole: "Changer de rôle",
    notifications: "Notifications",
  },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem("mediguard_lang") || "en");

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("mediguard_lang", lang);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
