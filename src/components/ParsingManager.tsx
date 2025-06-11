import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// Import the parsers (we'll need to adapt them for multi-tab parsing)
// For now, I'll include the parsing logic directly in this component

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
  master_accounting?: any;
  
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

interface EditingState {
  [clientNumber: string]: boolean;
}

interface ParsingManagerProps {
  onClientsUpdated?: (clients: Client[]) => void;
}

const ParsingManager: React.FC<ParsingManagerProps> = ({ onClientsUpdated }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStates, setEditingStates] = useState<EditingState>({});
  const [editedData, setEditedData] = useState<{ [clientNumber: string]: Partial<Client> }>({});
  
  // Track uploaded files
  const [uploadedFiles, setUploadedFiles] = useState({
    v2: false,
    v3: false,
    v4: false,
    master_accounting: false
  });
  
  // Store parsed data from each file type
  const [fileData, setFileData] = useState<{
    v2: Client[];
    v3: Client[];
    v4: Client[];
    master_accounting: Client[];
  }>({
    v2: [],
    v3: [],
    v4: [],
    master_accounting: []
  });

  // Helper function to parse dates
  const parseDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    try {
      if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
        return jsDate.toISOString();
      }
      
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

  // Parse a single V2/V3/V4 sheet (adapted from individual parsers)
  const parseClientSheet = (rows: any[][], sheetName: string, version: 'v2' | 'v3' | 'v4'): Client => {
    const versionData: any = {
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

    // Add V2-specific fields if needed
    if (version === 'v2') {
      Object.assign(versionData, {
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
      });
    }

    // Parse main client data row (Row 8 for V3/V4, similar logic for V2)
    const clientDataRow = rows[7]; // Row 8 (0-indexed as 7)
    if (clientDataRow) {
      versionData.tdyType = clientDataRow[1]?.toString().trim() || '';
      versionData.dealType = clientDataRow[2]?.toString().trim() || '';
      versionData.clientWorksheetUrl = clientDataRow[3]?.toString().trim() || '';
      versionData.contractStatus = clientDataRow[4]?.toString().trim() || '';
      
      const roommatesText = clientDataRow[5]?.toString().trim().toLowerCase();
      versionData.hasRoommates = roommatesText === 'yes' || roommatesText === 'y';
      versionData.totalRoommates = parseInt(clientDataRow[6]?.toString()) || 0;
    }

    // Parse personal info using header-based approach
    const headerRow = rows[5]; // Row 6 contains headers
    const personalDataRow = rows[6]; // Row 7 has personal data

    if (headerRow && personalDataRow) {
      const lastNameIndex = headerRow.indexOf('Last Name');
      const firstNameIndex = headerRow.indexOf('First');
      const tdyLocationIndex = headerRow.indexOf('TDY Location');
      const contractStartIndex = headerRow.indexOf('Contract Start');
      const contractEndIndex = headerRow.indexOf('Contract End');
      const govAgencyIndex = headerRow.indexOf('Gov Agency or Dept');
      const cellIndex = headerRow.indexOf('Cell');
      const emailIndex = headerRow.indexOf('Email');
      const govEmailIndex = headerRow.indexOf('Gov Email');

      if (lastNameIndex >= 0) versionData.lastName = personalDataRow[lastNameIndex]?.toString().trim() || '';
      if (firstNameIndex >= 0) versionData.firstName = personalDataRow[firstNameIndex]?.toString().trim() || '';
      if (tdyLocationIndex >= 0) versionData.tdyLocation = personalDataRow[tdyLocationIndex]?.toString().trim() || '';
      if (contractStartIndex >= 0) versionData.contractStartDate = parseDate(personalDataRow[contractStartIndex]);
      if (contractEndIndex >= 0) versionData.contractEndDate = parseDate(personalDataRow[contractEndIndex]);
      if (govAgencyIndex >= 0) versionData.govAgencyOrDept = personalDataRow[govAgencyIndex]?.toString().trim() || '';
      if (cellIndex >= 0) versionData.cell = personalDataRow[cellIndex]?.toString().trim() || '';
      if (emailIndex >= 0) versionData.email = personalDataRow[emailIndex]?.toString().trim() || '';
      if (govEmailIndex >= 0) versionData.govEmail = personalDataRow[govEmailIndex]?.toString().trim() || '';
    }

    // Parse additional V2 fields
    if (version === 'v2') {
      const addressRow = rows[12]; // Row 13 for address info
      if (addressRow) {
        versionData.billingAddress = addressRow[12]?.toString().trim() || '';
        versionData.billingCity = addressRow[13]?.toString().trim() || '';
        versionData.billingState = addressRow[14]?.toString().trim() || '';
        versionData.billingZip = addressRow[15]?.toString().trim() || '';
        versionData.deliveryAddress = addressRow[16]?.toString().trim() || '';
        versionData.deliveryCity = addressRow[17]?.toString().trim() || '';
        versionData.deliveryState = addressRow[18]?.toString().trim() || '';
        versionData.deliveryZip = addressRow[19]?.toString().trim() || '';
        versionData.monthlyRent = parseFloat(addressRow[20]) || 0;
        versionData.monthlyUtilities = parseFloat(addressRow[21]) || 0;
      }
    }

    // Create client object
    const now = new Date().toISOString();
    const client: Client = {
      isInV2: version === 'v2',
      isInV3: version === 'v3',
      isInV4: version === 'v4',
      isInMasterAccounting: false,
      
      // Set version-specific data
      [version.toUpperCase()]: versionData,
      
      // Root level fields
      clientNumber: versionData.clientNumber,
      firstName: versionData.firstName,
      lastName: versionData.lastName,
      email: versionData.email,
      govEmail: versionData.govEmail,
      cell: versionData.cell,
      tdyLocation: versionData.tdyLocation,
      govAgencyOrDept: versionData.govAgencyOrDept,
      tdyType: versionData.tdyType,
      dealType: versionData.dealType,
      contractStatus: versionData.contractStatus,
      hasRoommates: versionData.hasRoommates,
      totalRoommates: versionData.totalRoommates,
      perDiemStartDate: versionData.perDiemStartDate,
      perDiemEndDate: versionData.perDiemEndDate,
      contractStartDate: versionData.contractStartDate,
      contractEndDate: versionData.contractEndDate,
      maxLodgingAllocation: versionData.maxLodgingAllocation,
      liquidationTaxRate: versionData.liquidationTaxRate,
      referralSource: versionData.referralSource,
      referralFeeType: versionData.referralFeeType,
      salesRep: versionData.salesRep,
      lodgingTaxExempt: versionData.lodgingTaxExempt,
      lodgingTaxReimbursable: versionData.lodgingTaxReimbursable,
      taxCalculationMethod: versionData.taxCalculationMethod,
      clientWorksheetUrl: versionData.clientWorksheetUrl,
      numberOfNights: versionData.numberOfNights,
      
      createdAt: now,
      updatedAt: now,
    };

    return client;
  };

  // Parse master accounting file (adapted from MasterAccountingParser)
  const parseMasterAccounting = (rows: any[][]): Client[] => {
    const clients: Client[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const clientNumber = row[1];
      if (typeof clientNumber === 'number' && clientNumber > 0 && clientNumber < 1000) {
        const masterAccountingData = {
          tab: 'AllAccounts',
          clientNumber: clientNumber.toString(),
          salesNotes: row[2]?.toString().trim() || '',
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
          paymentStatuses: [] as string[],
        };

        // Extract payment statuses
        const statusStartIndex = row.indexOf('Status:');
        if (statusStartIndex >= 0) {
          for (let j = statusStartIndex + 1; j < row.length; j++) {
            const status = row[j];
            if (status && typeof status === 'string') {
              masterAccountingData.paymentStatuses.push(status);
            } else {
              break;
            }
          }
        }

        // Parse following rows for detailed data
        for (let j = i + 1; j < i + 8 && j < rows.length; j++) {
          const dataRow = rows[j];
          if (!dataRow) continue;

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
        }

        const now = new Date().toISOString();
        const client: Client = {
          isInV2: false,
          isInV3: false,
          isInV4: false,
          isInMasterAccounting: true,
          
          master_accounting: masterAccountingData,
          
          clientNumber: masterAccountingData.clientNumber,
          firstName: masterAccountingData.firstName,
          lastName: masterAccountingData.lastName,
          liquidationTaxRate: masterAccountingData.liquidationTaxRate,
          
          createdAt: now,
          updatedAt: now,
        };

        clients.push(client);
      }
    }

    return clients;
  };

  // Merge clients with same client number
  const mergeClients = (newClients: Client[]): Client[] => {
    const clientMap = new Map<string, Client>();

    // Merge new clients
    newClients.forEach(newClient => {
      const existing = clientMap.get(newClient.clientNumber);
      if (existing) {
        // Merge the clients
        const merged: Client = {
          ...existing,
          isInV2: existing.isInV2 || newClient.isInV2,
          isInV3: existing.isInV3 || newClient.isInV3,
          isInV4: existing.isInV4 || newClient.isInV4,
          isInMasterAccounting: existing.isInMasterAccounting || newClient.isInMasterAccounting,
          
          // Merge version-specific data
          V2: newClient.V2 || existing.V2,
          V3: newClient.V3 || existing.V3,
          V4: newClient.V4 || existing.V4,
          master_accounting: newClient.master_accounting || existing.master_accounting,
          
          // Update root fields with most recent data (prioritize newer)
          firstName: newClient.firstName || existing.firstName,
          lastName: newClient.lastName || existing.lastName,
          email: newClient.email || existing.email,
          govEmail: newClient.govEmail || existing.govEmail,
          cell: newClient.cell || existing.cell,
          tdyLocation: newClient.tdyLocation || existing.tdyLocation,
          govAgencyOrDept: newClient.govAgencyOrDept || existing.govAgencyOrDept,
          tdyType: newClient.tdyType || existing.tdyType,
          dealType: newClient.dealType || existing.dealType,
          contractStatus: newClient.contractStatus || existing.contractStatus,
          hasRoommates: newClient.hasRoommates !== undefined ? newClient.hasRoommates : existing.hasRoommates,
          totalRoommates: newClient.totalRoommates || existing.totalRoommates,
          perDiemStartDate: newClient.perDiemStartDate || existing.perDiemStartDate,
          perDiemEndDate: newClient.perDiemEndDate || existing.perDiemEndDate,
          contractStartDate: newClient.contractStartDate || existing.contractStartDate,
          contractEndDate: newClient.contractEndDate || existing.contractEndDate,
          maxLodgingAllocation: newClient.maxLodgingAllocation || existing.maxLodgingAllocation,
          liquidationTaxRate: newClient.liquidationTaxRate || existing.liquidationTaxRate,
          referralSource: newClient.referralSource || existing.referralSource,
          referralFeeType: newClient.referralFeeType || existing.referralFeeType,
          salesRep: newClient.salesRep || existing.salesRep,
          lodgingTaxExempt: newClient.lodgingTaxExempt !== undefined ? newClient.lodgingTaxExempt : existing.lodgingTaxExempt,
          lodgingTaxReimbursable: newClient.lodgingTaxReimbursable !== undefined ? newClient.lodgingTaxReimbursable : existing.lodgingTaxReimbursable,
          taxCalculationMethod: newClient.taxCalculationMethod || existing.taxCalculationMethod,
          clientWorksheetUrl: newClient.clientWorksheetUrl || existing.clientWorksheetUrl,
          numberOfNights: newClient.numberOfNights || existing.numberOfNights,
          
          updatedAt: new Date().toISOString(),
        };
        
        clientMap.set(newClient.clientNumber, merged);
      } else {
        clientMap.set(newClient.clientNumber, newClient);
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => 
      parseInt(a.clientNumber) - parseInt(b.clientNumber)
    );
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'v2' | 'v3' | 'v4' | 'master_accounting') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (fileType === 'master_accounting') {
        // Parse master accounting
        const sheet = workbook.Sheets['AllAccounts'];
        if (sheet) {
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          const newClients = parseMasterAccounting(rows);
          
          // Store the data and mark as uploaded
          setFileData(prev => ({ ...prev, [fileType]: newClients }));
          setUploadedFiles(prev => ({ ...prev, [fileType]: true }));
        }
      } else {
        // Parse V2/V3/V4 with multiple tabs
        const newClients: Client[] = [];
        
        // Filter sheet names to only include those that start with an integer (client numbers)
        const clientSheetNames = workbook.SheetNames.filter(sheetName => {
          // Check if the sheet name starts with a digit
          return /^\d/.test(sheetName.trim());
        });
        
        console.log(`Found ${clientSheetNames.length} client tabs out of ${workbook.SheetNames.length} total tabs:`, clientSheetNames);
        
        clientSheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          const client = parseClientSheet(rows, sheetName, fileType);
          newClients.push(client);
        });
        
        // Store the data and mark as uploaded
        setFileData(prev => ({ ...prev, [fileType]: newClients }));
        setUploadedFiles(prev => ({ ...prev, [fileType]: true }));
      }
    } catch (error) {
      console.error('Error parsing file:', error);
    } finally {
      setLoading(false);
    }
  };

  // Compile all client data
  const compileClientList = () => {
    const allClients: Client[] = [
      ...fileData.v2,
      ...fileData.v3,
      ...fileData.v4,
      ...fileData.master_accounting
    ];
    
    const mergedClients = mergeClients(allClients);
    setClients(mergedClients);
    onClientsUpdated?.(mergedClients);
  };

  // Check if all files are uploaded
  const allFilesUploaded = uploadedFiles.v2 && uploadedFiles.v3 && uploadedFiles.v4 && uploadedFiles.master_accounting;

  // Edit functions
  const startEditing = (clientNumber: string) => {
    setEditingStates(prev => ({ ...prev, [clientNumber]: true }));
  };

  const cancelEditing = (clientNumber: string) => {
    setEditingStates(prev => ({ ...prev, [clientNumber]: false }));
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[clientNumber];
      return newData;
    });
  };

  const saveEditing = (clientNumber: string) => {
    const edits = editedData[clientNumber];
    if (edits) {
      setClients(prev => prev.map(client => 
        client.clientNumber === clientNumber 
          ? { ...client, ...edits, updatedAt: new Date().toISOString() }
          : client
      ));
    }
    
    setEditingStates(prev => ({ ...prev, [clientNumber]: false }));
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[clientNumber];
      return newData;
    });
  };

  const updateField = (clientNumber: string, field: keyof Client, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [clientNumber]: {
        ...prev[clientNumber],
        [field]: value
      }
    }));
  };

  const getDisplayValue = (client: Client, field: keyof Client) => {
    const edited = editedData[client.clientNumber];
    if (edited && edited[field] !== undefined) {
      return edited[field];
    }
    return client[field];
  };

  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Client Data Management</h2>
      
      {/* File Upload Section */}
      <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            V2 File:
            {uploadedFiles.v2 && <span style={{ color: '#4CAF50', fontSize: '1.2rem' }}>✓</span>}
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileUpload(e, 'v2')}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        
        <div>
          <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            V3 File:
            {uploadedFiles.v3 && <span style={{ color: '#4CAF50', fontSize: '1.2rem' }}>✓</span>}
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileUpload(e, 'v3')}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        
        <div>
          <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            V4 File:
            {uploadedFiles.v4 && <span style={{ color: '#4CAF50', fontSize: '1.2rem' }}>✓</span>}
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileUpload(e, 'v4')}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        
        <div>
          <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Master Accounting:
            {uploadedFiles.master_accounting && <span style={{ color: '#4CAF50', fontSize: '1.2rem' }}>✓</span>}
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileUpload(e, 'master_accounting')}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
      </div>

      {/* Compile Button */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <button
          onClick={compileClientList}
          disabled={!allFilesUploaded}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            backgroundColor: allFilesUploaded ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: allFilesUploaded ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            boxShadow: allFilesUploaded ? '0 4px 8px rgba(40, 167, 69, 0.3)' : 'none'
          }}
        >
          {allFilesUploaded ? 'Compile Client List' : 'Upload All Files First'}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <div style={{ 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 2s linear infinite',
            margin: '0 auto'
          }}></div>
          <p>Parsing files...</p>
        </div>
      )}

      {/* Client Table */}
      {clients.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <h3>Clients ({clients.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Client #</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>TDY Location</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>TDY Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Deal Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Contract Start</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Contract End</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Versions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const isEditing = editingStates[client.clientNumber];
                const versions = [
                  client.isInV2 && 'V2',
                  client.isInV3 && 'V3',
                  client.isInV4 && 'V4',
                  client.isInMasterAccounting && 'MA'
                ].filter(Boolean).join(', ');

                return (
                  <tr key={client.clientNumber}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <div>
                          <button
                            onClick={() => saveEditing(client.clientNumber)}
                            style={{ marginRight: '5px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => cancelEditing(client.clientNumber)}
                            style={{ padding: '4px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(client.clientNumber)}
                          style={{ padding: '4px 8px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{client.clientNumber}</td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={`${getDisplayValue(client, 'firstName')} ${getDisplayValue(client, 'lastName')}`}
                          onChange={(e) => {
                            const [firstName, ...lastNameParts] = e.target.value.split(' ');
                            updateField(client.clientNumber, 'firstName', firstName || '');
                            updateField(client.clientNumber, 'lastName', lastNameParts.join(' ') || '');
                          }}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        `${client.firstName} ${client.lastName}`.trim()
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="email"
                          value={getDisplayValue(client, 'email') || ''}
                          onChange={(e) => updateField(client.clientNumber, 'email', e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        client.email || ''
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={getDisplayValue(client, 'tdyLocation') || ''}
                          onChange={(e) => updateField(client.clientNumber, 'tdyLocation', e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        client.tdyLocation || ''
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={getDisplayValue(client, 'tdyType') || ''}
                          onChange={(e) => updateField(client.clientNumber, 'tdyType', e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        client.tdyType || ''
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={getDisplayValue(client, 'dealType') || ''}
                          onChange={(e) => updateField(client.clientNumber, 'dealType', e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        client.dealType || ''
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="date"
                          value={getDisplayValue(client, 'contractStartDate') ? new Date(getDisplayValue(client, 'contractStartDate')).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateField(client.clientNumber, 'contractStartDate', e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        formatDate(client.contractStartDate)
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {isEditing ? (
                        <input
                          type="date"
                          value={getDisplayValue(client, 'contractEndDate') ? new Date(getDisplayValue(client, 'contractEndDate')).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateField(client.clientNumber, 'contractEndDate', e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      ) : (
                        formatDate(client.contractEndDate)
                      )}
                    </td>
                    
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      <span style={{ fontSize: '0.8em', backgroundColor: '#e3f2fd', padding: '2px 6px', borderRadius: '12px' }}>
                        {versions}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ParsingManager; 