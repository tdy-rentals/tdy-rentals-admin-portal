// src/components/V4Parser.tsx

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// V4-specific data structure
interface V4Data {
  tab: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  govEmail: string;
  cell: string;
  tdyLocation: string;
  govAgencyOrDept: string;
  tdyType: string;
  dealType: string;
  contractStatus: string;
  hasRoommates: boolean;
  totalRoommates: number;
  perDiemStartDate: string;
  perDiemEndDate: string;
  contractStartDate: string;
  contractEndDate: string;
  maxLodgingAllocation: number;
  liquidationTaxRate: number;
  referralSource: string;
  referralFeeType?: string;
  salesRep: string;
  lodgingTaxExempt: boolean;
  lodgingTaxReimbursable: boolean;
  taxCalculationMethod: string;
  clientWorksheetUrl: string;
  numberOfNights: number;
}

// Multi-version client structure
interface Client {
  // Version tracking flags
  isInV2: boolean;
  isInV3: boolean;
  isInV4: boolean;
  isInMasterAccounting: boolean;
  
  // Version-specific data
  V2?: any;
  V3?: any; 
  V4?: V4Data;
  master_accounting?: any; 
  
  // Root level fields (most recent/accurate across all files)
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  govEmail?: string;
  cell?: string;
  tdyLocation?: string;
  govAgencyOrDept?: string;
  tdyType?: string;
  dealType?: string;
  contractStatus?: string;
  hasRoommates?: boolean;
  totalRoommates?: number;
  perDiemStartDate?: string;
  perDiemEndDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  maxLodgingAllocation?: number;
  liquidationTaxRate?: number;
  referralSource?: string;
  referralFeeType?: string;
  salesRep?: string;
  lodgingTaxExempt?: boolean;
  lodgingTaxReimbursable?: boolean;
  taxCalculationMethod?: string;
  clientWorksheetUrl?: string;
  numberOfNights?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

interface V4ParserProps {
  onClientParsed?: (client: Client) => void;
  onFileUploadStarted?: () => void;
}

const V4Parser: React.FC<V4ParserProps> = ({ onClientParsed, onFileUploadStarted }) => {
  const [parsedClient, setParsedClient] = useState<Client | null>(null);

  // Helper function to parse dates
  const parseDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    try {
      // Handle Excel date numbers
      if (typeof dateValue === 'number') {
        // Excel date number to JavaScript date
        const excelEpoch = new Date(1900, 0, 1);
        const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
        return jsDate.toISOString();
      }
      
      // Handle string dates
      if (typeof dateValue === 'string') {
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
      
      return dateValue.toString();
    } catch {
      return dateValue?.toString() || '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Trigger loading state
    onFileUploadStarted?.();

    const reader = new FileReader();
    reader.onload = (e) => {
      // Add a small delay to show the spinner
      setTimeout(() => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Assuming single sheet → use first sheet name
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Initialize V4-specific data object
        const v4Data: V4Data = {
          tab: sheetName,
          clientNumber: sheetName,
          firstName: '',
          lastName: '',
          email: '',
          govEmail: '',
          cell: '',
          tdyLocation: '',
          govAgencyOrDept: '',
          tdyType: '',
          dealType: '',
          contractStatus: '',
          hasRoommates: false,
          totalRoommates: 0,
          perDiemStartDate: '',
          perDiemEndDate: '',
          contractStartDate: '',
          contractEndDate: '',
          maxLodgingAllocation: 0,
          liquidationTaxRate: 0,
          referralSource: '',
          referralFeeType: '',
          salesRep: '',
          lodgingTaxExempt: false,
          lodgingTaxReimbursable: false,
          taxCalculationMethod: '',
          clientWorksheetUrl: '',
          numberOfNights: 0,
        };

        // Parse Row 8 (index 7) - Main client data row (same structure as V3)
        // Based on analysis: Row 6 has headers, Row 7 has empty values, Row 8 has actual data
        const clientDataRow = rows[7];
        if (clientDataRow) {
          // Basic info from early columns
          v4Data.tdyType = clientDataRow[1]?.toString().trim() || '';
          v4Data.dealType = clientDataRow[2]?.toString().trim() || '';
          v4Data.clientWorksheetUrl = clientDataRow[3]?.toString().trim() || '';
          v4Data.contractStatus = clientDataRow[4]?.toString().trim() || '';
          
          // Roommates info
          const roommatesText = clientDataRow[5]?.toString().trim().toLowerCase();
          v4Data.hasRoommates = roommatesText === 'yes' || roommatesText === 'y';
          v4Data.totalRoommates = parseInt(clientDataRow[6]?.toString()) || 0;
        }

        // Parse Sales Rep from Row 6 (index 5), looking for "SalesRep" in early columns
        const salesRepRow = rows[5];
        if (salesRepRow) {
          // Look for SalesRep in columns 1-3
          for (let i = 1; i <= 3; i++) {
            if (salesRepRow[i]?.toString().trim() === 'SalesRep' && salesRepRow[i + 1]) {
              v4Data.salesRep = salesRepRow[i + 1].toString().trim();
              break;
            }
          }
        }

        // Parse client personal info using header-based approach (same as V3Parser)
        const headerRow = rows[5]; // Row 6 (0-indexed as 5) contains headers
        const personalDataRow = rows[6]; // Row 7 might have personal data

        if (headerRow && personalDataRow) {
          // Find header positions
          const lastNameIndex = headerRow.indexOf('Last Name');
          const firstNameIndex = headerRow.indexOf('First');
          const tdyLocationIndex = headerRow.indexOf('TDY Location');
          const contractStartIndex = headerRow.indexOf('Contract Start');
          const contractEndIndex = headerRow.indexOf('Contract End');
          const govAgencyIndex = headerRow.indexOf('Gov Agency or Dept');
          const cellIndex = headerRow.indexOf('Cell');
          const emailIndex = headerRow.indexOf('Email');
          const govEmailIndex = headerRow.indexOf('Gov Email');

          // Extract data if indices found
          if (lastNameIndex >= 0) v4Data.lastName = personalDataRow[lastNameIndex]?.toString().trim() || '';
          if (firstNameIndex >= 0) v4Data.firstName = personalDataRow[firstNameIndex]?.toString().trim() || '';
          if (tdyLocationIndex >= 0) v4Data.tdyLocation = personalDataRow[tdyLocationIndex]?.toString().trim() || '';
          if (contractStartIndex >= 0) v4Data.contractStartDate = parseDate(personalDataRow[contractStartIndex]);
          if (contractEndIndex >= 0) v4Data.contractEndDate = parseDate(personalDataRow[contractEndIndex]);
          if (govAgencyIndex >= 0) v4Data.govAgencyOrDept = personalDataRow[govAgencyIndex]?.toString().trim() || '';
          if (cellIndex >= 0) v4Data.cell = personalDataRow[cellIndex]?.toString().trim() || '';
          if (emailIndex >= 0) v4Data.email = personalDataRow[emailIndex]?.toString().trim() || '';
          if (govEmailIndex >= 0) v4Data.govEmail = personalDataRow[govEmailIndex]?.toString().trim() || '';
        }

        // Parse specific labeled fields using row iteration
        rows.forEach((row) => {
          if (!row) return;
          
          const label = row[0]?.toString().trim();
          const value = row[1];

          // Orders Start (Per Diem Start) - but check if it's not "SPECIAL CASES"
          if (label === 'Orders Start' && value && value.toString().trim() !== 'SPECIAL CASES') {
            v4Data.perDiemStartDate = parseDate(value);
          }
          
          // Orders End (Per Diem End)  
          if (label === 'Orders End' && value) {
            v4Data.perDiemEndDate = parseDate(value);
          }
          
          // Contract Value - but check if it's not "Tax Info"
          if (label === 'Contract Value' && value && value.toString().trim() !== 'Tax Info') {
            v4Data.maxLodgingAllocation = parseFloat(value) || 0;
          }
        });

        // Parse tax information - look for rows with tax-related headers
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          
          // Look for tax exempt/reimbursable info in any row
          if (row.includes('Lodging Tax Exempt') || row.includes('Lodging Tax Reimbursable')) {
            const exemptIndex = row.indexOf('Lodging Tax Exempt');
            const reimbursableIndex = row.indexOf('Lodging Tax Reimbursable');
            const methodIndex = row.indexOf('Tax Calculation Method');
            
            // Check the next row for values
            const nextRow = rows[i + 1];
            if (nextRow) {
              if (exemptIndex >= 0) {
                const exemptText = nextRow[exemptIndex]?.toString().trim().toLowerCase();
                v4Data.lodgingTaxExempt = exemptText === 'yes' || exemptText === 'y';
              }
              if (reimbursableIndex >= 0) {
                const reimbursableText = nextRow[reimbursableIndex]?.toString().trim().toLowerCase();
                v4Data.lodgingTaxReimbursable = reimbursableText === 'yes' || reimbursableText === 'y';
              }
              if (methodIndex >= 0) {
                v4Data.taxCalculationMethod = nextRow[methodIndex]?.toString().trim() || '';
              }
            }
          }
        }

        // Parse number of nights - look for "Number of Nights" label
        rows.forEach((row) => {
          if (!row) return;
          
          if (row.includes('Number of Nights')) {
            const nightsIndex = row.indexOf('Number of Nights');
            // Look for the number in the same row or adjacent cells
            for (let i = nightsIndex + 1; i < row.length && i < nightsIndex + 5; i++) {
              const nightsValue = parseInt(row[i]);
              if (!isNaN(nightsValue) && nightsValue > 0) {
                v4Data.numberOfNights = nightsValue;
                break;
              }
            }
          }
        });

        // Create the multi-version client structure
        const now = new Date().toISOString();
        const client: Client = {
          // Version tracking - this client is only in V4 format
          isInV2: false,
          isInV3: false,
          isInV4: true,
          isInMasterAccounting: false,
          
          // Version-specific data
          V4: v4Data,
          
          // Root level fields (copying from V4 since it's the only source)
          clientNumber: v4Data.clientNumber,
          firstName: v4Data.firstName,
          lastName: v4Data.lastName,
          email: v4Data.email,
          govEmail: v4Data.govEmail,
          cell: v4Data.cell,
          tdyLocation: v4Data.tdyLocation,
          govAgencyOrDept: v4Data.govAgencyOrDept,
          tdyType: v4Data.tdyType,
          dealType: v4Data.dealType,
          contractStatus: v4Data.contractStatus,
          hasRoommates: v4Data.hasRoommates,
          totalRoommates: v4Data.totalRoommates,
          perDiemStartDate: v4Data.perDiemStartDate,
          perDiemEndDate: v4Data.perDiemEndDate,
          contractStartDate: v4Data.contractStartDate,
          contractEndDate: v4Data.contractEndDate,
          maxLodgingAllocation: v4Data.maxLodgingAllocation,
          liquidationTaxRate: v4Data.liquidationTaxRate,
          referralSource: v4Data.referralSource,
          referralFeeType: v4Data.referralFeeType,
          salesRep: v4Data.salesRep,
          lodgingTaxExempt: v4Data.lodgingTaxExempt,
          lodgingTaxReimbursable: v4Data.lodgingTaxReimbursable,
          taxCalculationMethod: v4Data.taxCalculationMethod,
          clientWorksheetUrl: v4Data.clientWorksheetUrl,
          numberOfNights: v4Data.numberOfNights,
          
          // Metadata
          createdAt: now,
          updatedAt: now,
        };

        setParsedClient(client);
        console.log('Parsed client (V4 structure):', client);
        
        // Call the callback if provided
        onClientParsed?.(client);
      }, 1500); // 1.5 second delay to show the parsing animation
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".xlsx" 
        onChange={handleFileUpload}
        style={{
          padding: '0.5rem',
          border: '2px dashed #ccc',
          borderRadius: '4px',
          width: '100%',
          textAlign: 'center',
          cursor: 'pointer'
        }}
      />

      {parsedClient && !onClientParsed && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Parsed Client Data (V4):</h3>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Version Flags:</h4>
            <p>V2: {parsedClient.isInV2 ? 'Yes' : 'No'}</p>
            <p>V3: {parsedClient.isInV3 ? 'Yes' : 'No'}</p>
            <p>V4: {parsedClient.isInV4 ? 'Yes' : 'No'}</p>
            <p>Master Accounting: {parsedClient.isInMasterAccounting ? 'Yes' : 'No'}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <h4>V4-Specific Fields:</h4>
            <p>Tab: {parsedClient.V4?.tab}</p>
            <p>TDY Type: {parsedClient.V4?.tdyType}</p>
            <p>Deal Type: {parsedClient.V4?.dealType}</p>
            <p>Contract Status: {parsedClient.V4?.contractStatus}</p>
          </div>
          <pre style={{ fontSize: '12px' }}>{JSON.stringify(parsedClient, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default V4Parser; 