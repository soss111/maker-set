export interface SystemSettings {
  // Invoice Settings
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyTaxId: string;
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankSwift: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  paymentTerms: string;
  defaultInvoiceTemplate: string;
  
  // Cart Settings
  handlingFee: number;
  handlingFeeDescription: string;
}

export class SystemSettingsService {
  private static readonly STORAGE_KEY = 'system_settings';
  
  private static defaultSettings: SystemSettings = {
    companyName: 'MakerSet Solutions',
    companyAddress: '123 Innovation Street, Tech City, TC 12345, Estonia',
    companyPhone: '+372 123 4567',
    companyEmail: 'info@makerset.com',
    companyWebsite: 'www.makerset.com',
    companyTaxId: 'EE123456789',
    bankName: 'Estonian Bank',
    bankAccountNumber: '1234567890',
    bankIban: 'EE123456789012345678',
    bankSwift: 'ESTBEE2X',
    invoicePrefix: 'INV',
    defaultTaxRate: 20, // 20%
    paymentTerms: 'prepayment',
    defaultInvoiceTemplate: 'modern',
    
    // Cart Settings
    handlingFee: 15, // 15€ handling fee
    handlingFeeDescription: 'Handling, Packaging & Transport',
  };

  static getSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
    return this.defaultSettings;
  }

  static saveSettings(settings: Partial<SystemSettings>): void {
    try {
      const currentSettings = this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving system settings:', error);
    }
  }

  static resetSettings(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting system settings:', error);
    }
  }

  static getCompanyInfo() {
    const settings = this.getSettings();
    return {
      name: settings.companyName,
      address: settings.companyAddress,
      phone: settings.companyPhone,
      email: settings.companyEmail,
      website: settings.companyWebsite,
      taxId: settings.companyTaxId,
      bankAccount: {
        bankName: settings.bankName,
        accountNumber: settings.bankAccountNumber,
        iban: settings.bankIban,
        swift: settings.bankSwift,
      }
    };
  }

  static getInvoiceSettings() {
    const settings = this.getSettings();
    return {
      prefix: settings.invoicePrefix,
      taxRate: settings.defaultTaxRate / 100, // Convert percentage to decimal
      paymentTerms: settings.paymentTerms,
      template: settings.defaultInvoiceTemplate,
    };
  }
}
