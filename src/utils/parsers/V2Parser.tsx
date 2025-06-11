// src/components/V2Parser.tsx

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// V2-specific data structure
interface V2Data {
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
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  monthlyRent: number;
  monthlyUtilities: number;
}

// Multi-version client structure (same as V3Parser)
interface Client {
  // Version tracking flags
  isInV2: boolean;
  isInV3: boolean;
  isInV4: boolean;
  isInMasterAccounting: boolean;
  
  // Version-specific data
  V2?: V2Data;
  V3?: any; 
  V4?: any; 
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

interface V2ParserProps {
  onClientParsed?: (client: Client) => void;
  onFileUploadStarted?: () => void;
}

const V2Parser: React.FC<V2ParserProps> = ({ onClientParsed, onFileUploadStarted }) => {
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

        // Initialize V2-specific data object
        const v2Data: V2Data = {
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
          billingAddress: '',
          billingCity: '',
          billingState: '',
          billingZip: '',
          deliveryAddress: '',
          deliveryCity: '',
          deliveryState: '',
          deliveryZip: '',
          monthlyRent: 0,
          monthlyUtilities: 0,
        };

        // Parse Row 8 (index 7) - Main client data row
        // Based on analysis: Row 6 has headers, Row 7 has empty values, Row 8 has actual data
        const clientDataRow = rows[7];
        if (clientDataRow) {
          // Basic info from early columns
          v2Data.tdyType = clientDataRow[1]?.toString().trim() || '';
          v2Data.dealType = clientDataRow[2]?.toString().trim() || '';
          v2Data.clientWorksheetUrl = clientDataRow[3]?.toString().trim() || '';
          v2Data.contractStatus = clientDataRow[4]?.toString().trim() || '';
          
          // Roommates info
          const roommatesText = clientDataRow[5]?.toString().trim().toLowerCase();
          v2Data.hasRoommates = roommatesText === 'yes' || roommatesText === 'y';
          v2Data.totalRoommates = parseInt(clientDataRow[6]?.toString()) || 0;
        }

        // Parse client personal info from Row 6 headers / Row 7+ data
        // Looking for name, contact info in columns 12-21 based on headers in Row 6
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
          if (lastNameIndex >= 0) v2Data.lastName = personalDataRow[lastNameIndex]?.toString().trim() || '';
          if (firstNameIndex >= 0) v2Data.firstName = personalDataRow[firstNameIndex]?.toString().trim() || '';
          if (tdyLocationIndex >= 0) v2Data.tdyLocation = personalDataRow[tdyLocationIndex]?.toString().trim() || '';
          if (contractStartIndex >= 0) v2Data.contractStartDate = parseDate(personalDataRow[contractStartIndex]);
          if (contractEndIndex >= 0) v2Data.contractEndDate = parseDate(personalDataRow[contractEndIndex]);
          if (govAgencyIndex >= 0) v2Data.govAgencyOrDept = personalDataRow[govAgencyIndex]?.toString().trim() || '';
          if (cellIndex >= 0) v2Data.cell = personalDataRow[cellIndex]?.toString().trim() || '';
          if (emailIndex >= 0) v2Data.email = personalDataRow[emailIndex]?.toString().trim() || '';
          if (govEmailIndex >= 0) v2Data.govEmail = personalDataRow[govEmailIndex]?.toString().trim() || '';
        }

        // Parse address info from Row 13 (index 12) - contains billing/delivery address headers and data
        const addressRow = rows[12];
        if (addressRow) {
          // Based on the structure: columns 12-19 contain address fields
          v2Data.billingAddress = addressRow[12]?.toString().trim() || '';
          v2Data.billingCity = addressRow[13]?.toString().trim() || '';
          v2Data.billingState = addressRow[14]?.toString().trim() || '';
          v2Data.billingZip = addressRow[15]?.toString().trim() || '';
          v2Data.deliveryAddress = addressRow[16]?.toString().trim() || '';
          v2Data.deliveryCity = addressRow[17]?.toString().trim() || '';
          v2Data.deliveryState = addressRow[18]?.toString().trim() || '';
          v2Data.deliveryZip = addressRow[19]?.toString().trim() || '';
          
          // Monthly rent and utilities in columns 20-21
          v2Data.monthlyRent = parseFloat(addressRow[20]) || 0;
          v2Data.monthlyUtilities = parseFloat(addressRow[21]) || 0;
        }

        // Parse tax information from Row 15 (index 14)
        const taxInfoRow = rows[14];
        if (taxInfoRow) {
          // Based on Row 14 headers: columns 3-5 contain tax info
          const exemptText = taxInfoRow[3]?.toString().trim().toLowerCase();
          v2Data.lodgingTaxExempt = exemptText === 'yes' || exemptText === 'y';
          
          const reimbursableText = taxInfoRow[4]?.toString().trim().toLowerCase();
          v2Data.lodgingTaxReimbursable = reimbursableText === 'yes' || reimbursableText === 'y';
          
          v2Data.taxCalculationMethod = taxInfoRow[5]?.toString().trim() || '';
        }

        // Parse specific labeled fields using row iteration
        rows.forEach((row) => {
          if (!row) return;
          
          const label = row[0]?.toString().trim();
          const value = row[1];

          // Orders Start (Per Diem Start)
          if (label === 'Orders Start') {
            v2Data.perDiemStartDate = parseDate(value);
          }
          
          // Orders End (Per Diem End)  
          if (label === 'Orders End') {
            v2Data.perDiemEndDate = parseDate(value);
          }
          
          // Contract Value
          if (label === 'Contract Value') {
            v2Data.maxLodgingAllocation = parseFloat(value) || 0;
          }
        });

        // Create the multi-version client structure
        const now = new Date().toISOString();
        const client: Client = {
          // Version tracking - this client is only in V2 format
          isInV2: true,
          isInV3: false,
          isInV4: false,
          isInMasterAccounting: false,
          
          // Version-specific data
          V2: v2Data,
          
          // Root level fields (copying from V2 since it's the only source)
          clientNumber: v2Data.clientNumber,
          firstName: v2Data.firstName,
          lastName: v2Data.lastName,
          email: v2Data.email,
          govEmail: v2Data.govEmail,
          cell: v2Data.cell,
          tdyLocation: v2Data.tdyLocation,
          govAgencyOrDept: v2Data.govAgencyOrDept,
          tdyType: v2Data.tdyType,
          dealType: v2Data.dealType,
          contractStatus: v2Data.contractStatus,
          hasRoommates: v2Data.hasRoommates,
          totalRoommates: v2Data.totalRoommates,
          perDiemStartDate: v2Data.perDiemStartDate,
          perDiemEndDate: v2Data.perDiemEndDate,
          contractStartDate: v2Data.contractStartDate,
          contractEndDate: v2Data.contractEndDate,
          maxLodgingAllocation: v2Data.maxLodgingAllocation,
          liquidationTaxRate: v2Data.liquidationTaxRate,
          referralSource: v2Data.referralSource,
          referralFeeType: v2Data.referralFeeType,
          salesRep: v2Data.salesRep,
          lodgingTaxExempt: v2Data.lodgingTaxExempt,
          lodgingTaxReimbursable: v2Data.lodgingTaxReimbursable,
          taxCalculationMethod: v2Data.taxCalculationMethod,
          clientWorksheetUrl: v2Data.clientWorksheetUrl,
          numberOfNights: v2Data.numberOfNights,
          
          // Metadata
          createdAt: now,
          updatedAt: now,
        };

        setParsedClient(client);
        console.log('Parsed client (V2 structure):', client);
        
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
          <h3>Parsed Client Data (V2):</h3>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Version Flags:</h4>
            <p>V2: {parsedClient.isInV2 ? 'Yes' : 'No'}</p>
            <p>V3: {parsedClient.isInV3 ? 'Yes' : 'No'}</p>
            <p>V4: {parsedClient.isInV4 ? 'Yes' : 'No'}</p>
            <p>Master Accounting: {parsedClient.isInMasterAccounting ? 'Yes' : 'No'}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <h4>V2-Specific Fields:</h4>
            <p>Billing Address: {parsedClient.V2?.billingAddress}</p>
            <p>Monthly Rent: ${parsedClient.V2?.monthlyRent}</p>
            <p>Monthly Utilities: ${parsedClient.V2?.monthlyUtilities}</p>
          </div>
          <pre style={{ fontSize: '12px' }}>{JSON.stringify(parsedClient, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default V2Parser; 