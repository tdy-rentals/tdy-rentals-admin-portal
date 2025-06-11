// src/components/MasterAccountingParser.tsx

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// Master Accounting-specific data structure
interface MasterAccountingData {
  tab: string;
  clientNumber: string;
  salesNotes: string;
  operationsNotes: string;
  accountingNotes: string;
  contractTaxRate: number;
  liquidationTaxRate: number;
  paymentType: string;
  lastFourDigits: string;
  lastName: string;
  firstName: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  paymentStatuses: string[]; // Array of payment statuses for different periods
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
  V4?: any;
  master_accounting?: MasterAccountingData;
  
  // Root level fields (most recent/accurate across all files)
  clientNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
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

interface MasterAccountingParserProps {
  onClientssParsed?: (clients: Client[]) => void;
  onFileUploadStarted?: () => void;
}

const MasterAccountingParser: React.FC<MasterAccountingParserProps> = ({ onClientssParsed, onFileUploadStarted }) => {
  const [parsedClients, setParsedClients] = useState<Client[]>([]);

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

        // Get the AllAccounts sheet
        const sheet = workbook.Sheets['AllAccounts'];
        if (!sheet) {
          console.error('AllAccounts sheet not found');
          return;
        }

        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const clients: Client[] = [];

        // Find client entries (rows with client numbers in column B)
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;

          // Check if this row has a client number in column B (index 1)
          const clientNumber = row[1];
          if (typeof clientNumber === 'number' && clientNumber > 0 && clientNumber < 1000) {
            
            // Parse this client's data
            const masterAccountingData: MasterAccountingData = {
              tab: 'AllAccounts',
              clientNumber: clientNumber.toString(),
              salesNotes: '',
              operationsNotes: '',
              accountingNotes: '',
              contractTaxRate: 0,
              liquidationTaxRate: 0,
              paymentType: '',
              lastFourDigits: '',
              lastName: '',
              firstName: '',
              billingAddress: '',
              billingCity: '',
              billingState: '',
              billingZip: '',
              paymentStatuses: [],
            };

            // Extract notes from column C (index 2)
            const notes = row[2]?.toString().trim() || '';
            
            // Extract payment statuses from columns 11+ (starting after "Status:")
            const statusStartIndex = row.indexOf('Status:');
            if (statusStartIndex >= 0) {
              for (let j = statusStartIndex + 1; j < row.length; j++) {
                const status = row[j];
                if (status && typeof status === 'string') {
                  masterAccountingData.paymentStatuses.push(status);
                } else if (status === null || status === undefined) {
                  break; // Stop when we hit empty cells
                }
              }
            }

            // Parse the following rows for this client's detailed data
            for (let j = i + 1; j < i + 8 && j < rows.length; j++) {
              const dataRow = rows[j];
              if (!dataRow) continue;

              // Check row labels
              const label = dataRow[0]?.toString().trim();
              
              if (label === 'Sales Notes') {
                masterAccountingData.salesNotes = notes;
              } else if (label === 'Operations Notes') {
                masterAccountingData.operationsNotes = notes;
              } else if (label === 'Accounting Notes') {
                masterAccountingData.accountingNotes = notes;
              }

              // Extract tax rates
              if (dataRow.includes('Contract Tax')) {
                const taxIndex = dataRow.indexOf('Contract Tax');
                if (taxIndex >= 0 && dataRow[taxIndex + 1]) {
                  masterAccountingData.contractTaxRate = parseFloat(dataRow[taxIndex + 1]) || 0;
                }
              }

              if (dataRow.includes('Liquidation Tax')) {
                const taxIndex = dataRow.indexOf('Liquidation Tax');
                if (taxIndex >= 0 && dataRow[taxIndex + 1]) {
                  masterAccountingData.liquidationTaxRate = parseFloat(dataRow[taxIndex + 1]) || 0;
                }
              }

              // Extract payment type
              if (dataRow.includes('Payment Type')) {
                const paymentIndex = dataRow.indexOf('Payment Type');
                if (paymentIndex >= 0 && dataRow[paymentIndex + 1]) {
                  masterAccountingData.paymentType = dataRow[paymentIndex + 1]?.toString().trim() || '';
                }
              }

              // Extract last 4 digits
              if (dataRow.includes('$ Last 4')) {
                const digitsIndex = dataRow.indexOf('$ Last 4');
                if (digitsIndex >= 0 && dataRow[digitsIndex + 1]) {
                  masterAccountingData.lastFourDigits = dataRow[digitsIndex + 1]?.toString().trim() || '';
                }
              }

              // Extract personal info if headers are present
              const lastNameIndex = dataRow.indexOf('Last');
              const firstNameIndex = dataRow.indexOf('First');
              const billingAddressIndex = dataRow.indexOf('Billing Address');
              const billCityIndex = dataRow.indexOf('Bill City');
              const billStateIndex = dataRow.indexOf('Bill State');
              const billZipIndex = dataRow.indexOf('Bill Zip');

              // Check if this row has personal data (not just headers)
              if (lastNameIndex >= 0 && dataRow[lastNameIndex] !== 'Last') {
                masterAccountingData.lastName = dataRow[lastNameIndex]?.toString().trim() || '';
              }
              if (firstNameIndex >= 0 && dataRow[firstNameIndex] !== 'First') {
                masterAccountingData.firstName = dataRow[firstNameIndex]?.toString().trim() || '';
              }
              if (billingAddressIndex >= 0 && dataRow[billingAddressIndex] !== 'Billing Address') {
                masterAccountingData.billingAddress = dataRow[billingAddressIndex]?.toString().trim() || '';
              }
              if (billCityIndex >= 0 && dataRow[billCityIndex] !== 'Bill City') {
                masterAccountingData.billingCity = dataRow[billCityIndex]?.toString().trim() || '';
              }
              if (billStateIndex >= 0 && dataRow[billStateIndex] !== 'Bill State') {
                masterAccountingData.billingState = dataRow[billStateIndex]?.toString().trim() || '';
              }
              if (billZipIndex >= 0 && dataRow[billZipIndex] !== 'Bill Zip') {
                masterAccountingData.billingZip = dataRow[billZipIndex]?.toString().trim() || '';
              }
            }

            // Determine which type of notes this client has
            if (notes) {
              const firstRow = rows[i];
              const rowLabel = firstRow[0]?.toString().trim();
              if (rowLabel === 'Sales Notes') {
                masterAccountingData.salesNotes = notes;
              } else if (rowLabel === 'Operations Notes') {
                masterAccountingData.operationsNotes = notes;
              } else if (rowLabel === 'Accounting Notes') {
                masterAccountingData.accountingNotes = notes;
              } else {
                // Default to sales notes if no specific label
                masterAccountingData.salesNotes = notes;
              }
            }

            // Create the multi-version client structure
            const now = new Date().toISOString();
            const client: Client = {
              // Version tracking - this client is only in Master Accounting format
              isInV2: false,
              isInV3: false,
              isInV4: false,
              isInMasterAccounting: true,
              
              // Version-specific data
              master_accounting: masterAccountingData,
              
              // Root level fields (copying from Master Accounting since it's the only source)
              clientNumber: masterAccountingData.clientNumber,
              firstName: masterAccountingData.firstName,
              lastName: masterAccountingData.lastName,
              liquidationTaxRate: masterAccountingData.liquidationTaxRate,
              
              // Metadata
              createdAt: now,
              updatedAt: now,
            };

            clients.push(client);
          }
        }

        setParsedClients(clients);
        console.log('Parsed clients from Master Accounting:', clients);
        
        // Call the callback if provided
        onClientssParsed?.(clients);
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

      {parsedClients.length > 0 && !onClientssParsed && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Parsed Master Accounting Data:</h3>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Found {parsedClients.length} Clients:</h4>
            {parsedClients.slice(0, 5).map((client, index) => (
              <div key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid #ddd' }}>
                <p><strong>Client #{client.clientNumber}</strong></p>
                <p>Name: {client.firstName} {client.lastName}</p>
                <p>Contract Tax Rate: {(client.master_accounting?.contractTaxRate || 0) * 100}%</p>
                <p>Liquidation Tax Rate: {(client.master_accounting?.liquidationTaxRate || 0) * 100}%</p>
                <p>Payment Statuses: {client.master_accounting?.paymentStatuses.slice(0, 3).join(', ')}</p>
                <p>Notes: {client.master_accounting?.salesNotes || client.master_accounting?.operationsNotes || client.master_accounting?.accountingNotes || 'None'}</p>
              </div>
            ))}
            {parsedClients.length > 5 && (
              <p>... and {parsedClients.length - 5} more clients</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAccountingParser; 