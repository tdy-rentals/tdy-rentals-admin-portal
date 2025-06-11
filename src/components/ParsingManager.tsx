import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Container,
  Divider,
  IconButton,
  Input,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
  TableSortLabel
} from '@mui/material';
import {
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Comment as CommentIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

// Import the parsers (we'll need to adapt them for multi-tab parsing)
// For now, I'll include the parsing logic directly in this component

// Multi-version client structure
interface Client {
  // Unique identifier for this client
  uid: string;
  
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
  // Personal Information
  first_name: string;
  last_name: string;
  email?: string;
  gov_email?: string;
  cell?: string;
  tdy_location?: string;
  agency_department?: string;
  
  // Contract Information
  contract_start?: string;
  contract_end?: string;
  contract_value?: number;
  contract_status?: string;
  
  // TDY Information
  tdy_type?: string;
  deal_type?: string;
  client_ws_url?: string;
  roommates?: boolean;
  
  // Date Information
  orders_start?: string;
  orders_end?: string;
  traveler_start?: string;
  traveler_end?: string;
  
  // EFM (Eligible Family Member) Information
  efm_1_start?: string;
  efm_1_end?: string;
  efm_1_age?: number;
  efm_2_start?: string;
  efm_2_end?: string;
  efm_2_age?: number;
  efm_3_start?: string;
  efm_3_end?: string;
  efm_3_age?: number;
  efm_4_start?: string;
  efm_4_end?: string;
  efm_4_age?: number;
  efm_5_start?: string;
  efm_5_end?: string;
  efm_5_age?: number;
  efm_6_start?: string;
  efm_6_end?: string;
  efm_6_age?: number;
  
  // Financial Information
  avg_monthly_per_diem?: number;
  lowest_nightly_rate?: number;
  total_rental_bill_w_tax?: number;
  total_furniture_rental_bill?: number;
  furniture_spend_amount?: number;
  liquidation_price?: number;
  
  // Billing Information
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  
  // V3/V4 Only Fields
  total_lodging_allocation?: number;
  transaction_fees?: number;
  net?: number;
  min_per_diem_night?: number;
  max_nightly_lodging_spend?: number;
  min_required_furnishings_spend?: number;
  total_furniture_spend?: number;
  logistics_cost?: number;
  furnishing_transaction_fees?: number;
  gross_profit?: number;
  gross_profit_percentage?: number;
  num_nights?: number;
  property_name?: string;
  property_url?: string;
  
  // Billing Days
  first_billing_day?: string;
  last_billing_day?: string;
  
  // Legacy fields for backward compatibility
  firstName?: string;
  lastName?: string;
  tdyLocation?: string;
  govAgencyOrDept?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  tdyType?: string;
  dealType?: string;
  contractStatus?: string;
  hasRoommates?: boolean;
  clientWorksheetUrl?: string;
  
  // Other legacy fields
  govEmail?: string;
  totalRoommates?: number;
  perDiemStartDate?: string;
  perDiemEndDate?: string;
  maxLodgingAllocation?: number;
  liquidationTaxRate?: number;
  referralSource?: string;
  referralFeeType?: string;
  salesRep?: string;
  sales_rep?: string; // New field from cell mapping
  lodgingTaxExempt?: boolean;
  lodgingTaxReimbursable?: boolean;
  taxCalculationMethod?: string;
  numberOfNights?: number;
  comments?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

interface EditingState {
  [uid: string]: boolean;
}

interface ParsingManagerProps {
  onClientsUpdated?: (clients: Client[]) => void;
}

const ParsingManager: React.FC<ParsingManagerProps> = ({ onClientsUpdated }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStates, setEditingStates] = useState<EditingState>({});
  const [editedData, setEditedData] = useState<{ [uid: string]: Partial<Client> }>({});
  const [expandedRows, setExpandedRows] = useState<{ [uid: string]: boolean }>({});
  const [creatingInDatabase, setCreatingInDatabase] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'last_name' | 'contract_start' | 'contract_end'>('last_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    versions: [] as string[],
    tdyType: '',
    dealType: ''
  });
  
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

  // Cell mapping configuration based on the provided mapping CSV
  const CELL_MAPPING = {
    V2: {
      last_name: 'M7',
      first_name: 'N7',
      tdy_location: 'O7',
      contract_start: 'P7',
      contract_end: 'Q7',
      agency_department: 'R7',
      cell: 'S7',
      email: 'T7',
      gov_email: 'U7',
      contract_value: 'A15',
      orders_start: 'I19',
      orders_end: 'J19',
      traveler_start: 'I20',
      traveler_end: 'J20',
      efm_1_start: 'I22',
      efm_1_end: 'J22',
      efm_1_age: 'K22',
      efm_2_start: 'I23',
      efm_2_end: 'J23',
      efm_2_age: 'K23',
      efm_3_start: 'I24',
      efm_3_end: 'J24',
      efm_3_age: 'K24',
      efm_4_start: 'I25',
      efm_4_end: 'J25',
      efm_4_age: 'K25',
      efm_5_start: 'I26',
      efm_5_end: 'J26',
      efm_5_age: 'K26',
      efm_6_start: 'I27',
      efm_6_end: 'J27',
      efm_6_age: 'K27',
      tdy_type: 'B8',
      deal_type: 'C8',
      client_ws_url: 'D8',
      contract_status: 'E8',
      roommates: 'F8',
      avg_monthly_per_diem: 'D75',
      lowest_nightly_rate: 'D76',
      total_rental_bill_w_tax: 'H75',
      total_furniture_rental_bill: 'H77',
      furniture_spend_amount: 'H79',
      liquidation_price: 'H81',
      billing_address: 'H15',
      billing_city: 'I15',
      billing_state: 'J15',
      billing_zip: 'K15',
      first_billing_day: 'E270',
      last_billing_day: 'E272'
    },
    V3: {
      last_name: 'M7',
      first_name: 'N7',
      tdy_location: 'O7',
      contract_start: 'P7',
      contract_end: 'Q7',
      agency_department: 'R7',
      cell: 'S7',
      email: 'T7',
      gov_email: 'U7',
      sales_rep: 'C6',
      contract_value: 'A15',
      orders_start: 'N18',
      orders_end: 'O18',
      traveler_start: 'N19',
      traveler_end: 'O19',
      efm_1_start: 'N21',
      efm_1_end: 'O21',
      efm_1_age: 'P21',
      efm_2_start: 'N22',
      efm_2_end: 'O22',
      efm_2_age: 'P22',
      efm_3_start: 'N23',
      efm_3_end: 'O23',
      efm_3_age: 'P23',
      efm_4_start: 'N24',
      efm_4_end: 'O24',
      efm_4_age: 'P24',
      efm_5_start: 'N25',
      efm_5_end: 'O25',
      efm_5_age: 'P25',
      efm_6_start: 'N26',
      efm_6_end: 'O26',
      efm_6_age: 'P26',
      tdy_type: 'B8',
      deal_type: 'C8',
      client_ws_url: 'D8',
      contract_status: 'E8',
      roommates: 'F8',
      avg_monthly_per_diem: 'D101',
      lowest_nightly_rate: 'D102',
      total_rental_bill_w_tax: 'H101',
      total_furniture_rental_bill: 'H103',
      furniture_spend_amount: 'H105',
      liquidation_price: 'H107',
      billing_address: 'L199',
      billing_city: 'M199',
      billing_state: 'N199',
      billing_zip: 'O199',
      total_lodging_allocation: 'AD32',
      transaction_fees: 'AD33',
      net: 'AD34',
      min_per_diem_night: 'AD35',
      max_nightly_lodging_spend: 'AD36',
      min_required_furnishings_spend: 'AD37',
      total_furniture_spend: 'AD54',
      logistics_cost: 'AD55',
      furnishing_transaction_fees: 'AD56',
      gross_profit: 'AD57',
      gross_profit_percentage: 'AD58',
      num_nights: 'AD43',
      first_billing_day: 'E270',
      last_billing_day: 'E272',
      property_name: 'AD60',
      property_url: 'AD61'
    },
    V4: {
      last_name: 'M7',
      first_name: 'N7',
      tdy_location: 'O7',
      contract_start: 'P7',
      contract_end: 'Q7',
      agency_department: 'R7',
      cell: 'S7',
      email: 'T7',
      gov_email: 'U7',
      sales_rep: 'C6',
      contract_value: 'A15',
      orders_start: 'N18',
      orders_end: 'O18',
      traveler_start: 'N19',
      traveler_end: 'O19',
      efm_1_start: 'N21',
      efm_1_end: 'O21',
      efm_1_age: 'P21',
      efm_2_start: 'N22',
      efm_2_end: 'O22',
      efm_2_age: 'P22',
      efm_3_start: 'N23',
      efm_3_end: 'O23',
      efm_3_age: 'P23',
      efm_4_start: 'N24',
      efm_4_end: 'O24',
      efm_4_age: 'P24',
      efm_5_start: 'N25',
      efm_5_end: 'O25',
      efm_5_age: 'P25',
      efm_6_start: 'N26',
      efm_6_end: 'O26',
      efm_6_age: 'P26',
      tdy_type: 'B8',
      deal_type: 'C8',
      client_ws_url: 'D8',
      contract_status: 'E8',
      roommates: 'F8',
      avg_monthly_per_diem: 'D101',
      lowest_nightly_rate: 'D102',
      total_rental_bill_w_tax: 'H101',
      total_furniture_rental_bill: 'H103',
      furniture_spend_amount: 'H105',
      liquidation_price: 'H107',
      billing_address: 'L199',
      billing_city: 'M199',
      billing_state: 'N199',
      billing_zip: 'O199',
      total_lodging_allocation: 'AD32',
      transaction_fees: 'AD33',
      net: 'AD34',
      min_per_diem_night: 'AD35',
      max_nightly_lodging_spend: 'AD36',
      min_required_furnishings_spend: 'AD37',
      total_furniture_spend: 'AD54',
      logistics_cost: 'AD55',
      furnishing_transaction_fees: 'AD56',
      gross_profit: 'AD57',
      gross_profit_percentage: 'AD58',
      num_nights: 'AD43',
      first_billing_day: 'E270',
      last_billing_day: 'E272',
      property_name: 'AD60',
      property_url: 'AD61'
    }
  };

  // Helper function to convert Excel cell reference to row/column indices
  const cellToIndices = (cellRef: string) => {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: -1, col: -1 };
    
    const [, colStr, rowStr] = match;
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1; // Convert to 0-based index
    const row = parseInt(rowStr) - 1; // Convert to 0-based index
    
    return { row, col };
  };

  // Helper function to safely get cell value from rows array
  const getCellValue = (rows: any[], cellRef: string, defaultValue: any = '') => {
    const { row, col } = cellToIndices(cellRef);
    if (row < 0 || col < 0 || row >= rows.length) return defaultValue;
    
    try {
      const cell = rows[row]?.[col];
      if (cell === undefined || cell === null) return defaultValue;
      
      const value = cell.toString().trim();
      return value || defaultValue;
    } catch (error) {
      console.warn(`Error reading cell ${cellRef}:`, error);
      return defaultValue;
    }
  };

  // Helper function to safely get numeric cell value from rows array
  const getNumericCellValue = (rows: any[], cellRef: string, defaultValue: number = 0): number => {
    const value = getCellValue(rows, cellRef, '');
    if (!value) return defaultValue;
    
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Helper function to safely get boolean cell value from rows array
  const getBooleanCellValue = (rows: any[], cellRef: string, defaultValue: boolean = false): boolean => {
    const value = getCellValue(rows, cellRef, '').toLowerCase();
    return value === 'yes' || value === 'y' || value === 'true' || value === '1';
  };

  // Helper function to safely get date cell value from rows array
  const getDateCellValue = (rows: any[], cellRef: string, defaultValue: string = ''): string => {
    const value = getCellValue(rows, cellRef, '');
    return parseDate(value) || defaultValue;
  };

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

  // Helper function to check if a client has meaningful data (beyond just UID and version)
  const hasMeaningfulData = (client: Client): boolean => {
    // Check if client has any meaningful fields filled (excluding UID and version flags)
    const meaningfulFields = [
      client.first_name,
      client.last_name,
      client.email,
      client.gov_email,
      client.cell,
      client.tdy_location,
      client.agency_department,
      client.contract_start,
      client.contract_end,
      client.tdy_type,
      client.deal_type,
      client.contract_status,
      client.contract_value,
      client.orders_start,
      client.orders_end,
      client.traveler_start,
      client.traveler_end
    ];
    
    // Return true if any meaningful field has a non-empty value
    return meaningfulFields.some(field => field && field.toString().trim() !== '');
  };

  // Generic parser function using cell mapping
  const parseFileWithMapping = (workbook: any, version: 'V2' | 'V3' | 'V4'): Client[] => {
    const mapping = CELL_MAPPING[version];
    const clients: Client[] = [];
    
    console.log(`${version} - Found ${workbook.SheetNames.length} total sheets:`, workbook.SheetNames);
    
    workbook.SheetNames.forEach((sheetName: string) => {
      // Only process sheets that start with a digit (client number tabs)
      if (!/^\d/.test(sheetName.trim())) {
        console.log(`${version} - Skipping non-client sheet: ${sheetName}`);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;

      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      console.log(`${version} - Processing sheet: ${sheetName}, rows: ${rows.length}`);

      // Debug: Check what's in cell C6 for sales rep (V3/V4 only)
      if (version === 'V3' || version === 'V4') {
        const salesRepCell = getCellValue(rows, mapping.sales_rep || '');
        console.log(`${version} - Sheet ${sheetName} - Sales Rep from C6:`, {
          cellRef: mapping.sales_rep,
          rawValue: salesRepCell,
          cellExists: rows[5] && rows[5][2] ? 'yes' : 'no',
          row5col2: rows[5] ? rows[5][2] : 'row 5 missing',
          row6col3: rows[5] ? rows[5][2] : 'undefined'
        });
      }

      // Initialize version data object with all mapped fields
      const versionData: any = {
        label: sheetName,
        // Extract all fields using the mapping
        first_name: getCellValue(rows, mapping.first_name),
        last_name: getCellValue(rows, mapping.last_name),
        tdy_location: getCellValue(rows, mapping.tdy_location),
        contract_start: getDateCellValue(rows, mapping.contract_start),
        contract_end: getDateCellValue(rows, mapping.contract_end),
        agency_department: getCellValue(rows, mapping.agency_department),
        cell: getCellValue(rows, mapping.cell),
        email: getCellValue(rows, mapping.email),
        gov_email: getCellValue(rows, mapping.gov_email),
        sales_rep: getCellValue(rows, mapping.sales_rep || ''), // V3/V4 only, empty for V2
        contract_value: getNumericCellValue(rows, mapping.contract_value),
        orders_start: getDateCellValue(rows, mapping.orders_start),
        orders_end: getDateCellValue(rows, mapping.orders_end),
        traveler_start: getDateCellValue(rows, mapping.traveler_start),
        traveler_end: getDateCellValue(rows, mapping.traveler_end),
        efm_1_start: getDateCellValue(rows, mapping.efm_1_start),
        efm_1_end: getDateCellValue(rows, mapping.efm_1_end),
        efm_1_age: getNumericCellValue(rows, mapping.efm_1_age),
        efm_2_start: getDateCellValue(rows, mapping.efm_2_start),
        efm_2_end: getDateCellValue(rows, mapping.efm_2_end),
        efm_2_age: getNumericCellValue(rows, mapping.efm_2_age),
        efm_3_start: getDateCellValue(rows, mapping.efm_3_start),
        efm_3_end: getDateCellValue(rows, mapping.efm_3_end),
        efm_3_age: getNumericCellValue(rows, mapping.efm_3_age),
        efm_4_start: getDateCellValue(rows, mapping.efm_4_start),
        efm_4_end: getDateCellValue(rows, mapping.efm_4_end),
        efm_4_age: getNumericCellValue(rows, mapping.efm_4_age),
        efm_5_start: getDateCellValue(rows, mapping.efm_5_start),
        efm_5_end: getDateCellValue(rows, mapping.efm_5_end),
        efm_5_age: getNumericCellValue(rows, mapping.efm_5_age),
        efm_6_start: getDateCellValue(rows, mapping.efm_6_start),
        efm_6_end: getDateCellValue(rows, mapping.efm_6_end),
        efm_6_age: getNumericCellValue(rows, mapping.efm_6_age),
        tdy_type: getCellValue(rows, mapping.tdy_type),
        deal_type: getCellValue(rows, mapping.deal_type),
        client_ws_url: getCellValue(rows, mapping.client_ws_url),
        contract_status: getCellValue(rows, mapping.contract_status),
        roommates: getBooleanCellValue(rows, mapping.roommates),
        avg_monthly_per_diem: getNumericCellValue(rows, mapping.avg_monthly_per_diem),
        lowest_nightly_rate: getNumericCellValue(rows, mapping.lowest_nightly_rate),
        total_rental_bill_w_tax: getNumericCellValue(rows, mapping.total_rental_bill_w_tax),
        total_furniture_rental_bill: getNumericCellValue(rows, mapping.total_furniture_rental_bill),
        furniture_spend_amount: getNumericCellValue(rows, mapping.furniture_spend_amount),
        liquidation_price: getNumericCellValue(rows, mapping.liquidation_price),
        billing_address: getCellValue(rows, mapping.billing_address),
        billing_city: getCellValue(rows, mapping.billing_city),
        billing_state: getCellValue(rows, mapping.billing_state),
        billing_zip: getCellValue(rows, mapping.billing_zip),
        first_billing_day: getDateCellValue(rows, mapping.first_billing_day),
        last_billing_day: getDateCellValue(rows, mapping.last_billing_day)
      };

      // Add V3/V4 specific fields
      if (version === 'V3' || version === 'V4') {
        versionData.total_lodging_allocation = getNumericCellValue(rows, mapping.total_lodging_allocation);
        versionData.transaction_fees = getNumericCellValue(rows, mapping.transaction_fees);
        versionData.net = getNumericCellValue(rows, mapping.net);
        versionData.min_per_diem_night = getNumericCellValue(rows, mapping.min_per_diem_night);
        versionData.max_nightly_lodging_spend = getNumericCellValue(rows, mapping.max_nightly_lodging_spend);
        versionData.min_required_furnishings_spend = getNumericCellValue(rows, mapping.min_required_furnishings_spend);
        versionData.total_furniture_spend = getNumericCellValue(rows, mapping.total_furniture_spend);
        versionData.logistics_cost = getNumericCellValue(rows, mapping.logistics_cost);
        versionData.furnishing_transaction_fees = getNumericCellValue(rows, mapping.furnishing_transaction_fees);
        versionData.gross_profit = getNumericCellValue(rows, mapping.gross_profit);
        versionData.gross_profit_percentage = getNumericCellValue(rows, mapping.gross_profit_percentage);
        versionData.num_nights = getNumericCellValue(rows, mapping.num_nights);
        versionData.property_name = getCellValue(rows, mapping.property_name);
        versionData.property_url = getCellValue(rows, mapping.property_url);
      }

      // Skip if no name data
      if (!versionData.first_name && !versionData.last_name) {
        console.log(`${version} - Skipping sheet ${sheetName}: No name data found`);
        return;
      }

      const client: Client = {
        uid: generateUID(),
        
        // Version flags
        isInV2: version === 'V2',
        isInV3: version === 'V3',
        isInV4: version === 'V4',
        isInMasterAccounting: false,
        
        // Version data
        [version]: versionData,
        
        // Root level fields (all fields from mapping)
        ...versionData,
        
        // Legacy fields for backward compatibility
        firstName: versionData.first_name,
        lastName: versionData.last_name,
        tdyLocation: versionData.tdy_location,
        govAgencyOrDept: versionData.agency_department,
        contractStartDate: versionData.contract_start,
        contractEndDate: versionData.contract_end,
        tdyType: versionData.tdy_type,
        dealType: versionData.deal_type,
        contractStatus: versionData.contract_status,
        hasRoommates: versionData.roommates,
        clientWorksheetUrl: versionData.client_ws_url,
        govEmail: versionData.gov_email,
        salesRep: versionData.sales_rep, // Map new sales_rep to legacy salesRep
        
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`${version} - Created client:`, {
        sheet: sheetName,
        name: `${client.first_name} ${client.last_name}`,
        uid: client.uid,
        // Debug key fields that weren't showing in table
        sales_rep: client.sales_rep,
        contract_start: client.contract_start,
        contract_end: client.contract_end,
        tdy_type: client.tdy_type,
        deal_type: client.deal_type,
        email: client.email
      });

      clients.push(client);
    });

    // Filter out clients that only have UID and version info but no meaningful data
    const filteredClients = clients.filter(client => {
      const hasData = hasMeaningfulData(client);
      if (!hasData) {
        console.log(`${version} - Removing empty client from sheet ${client[version]?.label}: no meaningful data`);
      }
      return hasData;
    });

    console.log(`${version} - Total clients parsed: ${clients.length}, after filtering: ${filteredClients.length}`);
    return filteredClients;
  };

  // Parse V2 files
  const parseV2File = (workbook: any): Client[] => {
    return parseFileWithMapping(workbook, 'V2');
  };

  // Parse V3 files
  const parseV3File = (workbook: any): Client[] => {
    return parseFileWithMapping(workbook, 'V3');
  };

  // Parse V4 files
  const parseV4File = (workbook: any): Client[] => {
    return parseFileWithMapping(workbook, 'V4');
  };

  // Parse a single V2/V3/V4 sheet (adapted from individual parsers)
  const parseClientSheet = (rows: any[][], sheetName: string, version: 'v2' | 'v3' | 'v4'): Client => {
    const versionData: any = {
      label: sheetName, // Store the tab number/name as label
      first_name: '',
      last_name: '',
      email: '',
      gov_email: '',
      cell: '',
      tdy_location: '',
      agency_department: '',
      tdy_type: '',
      deal_type: '',
      contract_status: '',
      roommates: false,
      totalRoommates: 0,
      orders_start: '',
      orders_end: '',
      traveler_start: '',
      traveler_end: '',
      efm_1_start: '',
      efm_1_end: '',
      efm_1_age: 0,
      efm_2_start: '',
      efm_2_end: '',
      efm_2_age: 0,
      efm_3_start: '',
      efm_3_end: '',
      efm_3_age: 0,
      efm_4_start: '',
      efm_4_end: '',
      efm_4_age: 0,
      efm_5_start: '',
      efm_5_end: '',
      efm_5_age: 0,
      efm_6_start: '',
      efm_6_end: '',
      efm_6_age: 0,
      avg_monthly_per_diem: 0,
      lowest_nightly_rate: 0,
      total_rental_bill_w_tax: 0,
      total_furniture_rental_bill: 0,
      furniture_spend_amount: 0,
      liquidation_price: 0,
      billing_address: '',
      billing_city: '',
      billing_state: '',
      billing_zip: '',
      total_lodging_allocation: 0,
      transaction_fees: 0,
      net: 0,
      min_per_diem_night: 0,
      max_nightly_lodging_spend: 0,
      min_required_furnishings_spend: 0,
      total_furniture_spend: 0,
      logistics_cost: 0,
      furnishing_transaction_fees: 0,
      gross_profit: 0,
      gross_profit_percentage: 0,
      num_nights: 0,
      property_name: '',
      property_url: '',
      first_billing_day: '',
      last_billing_day: '',
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
      versionData.tdy_type = clientDataRow[1]?.toString().trim() || '';
      versionData.deal_type = clientDataRow[2]?.toString().trim() || '';
      versionData.client_ws_url = clientDataRow[3]?.toString().trim() || '';
      versionData.contract_status = clientDataRow[4]?.toString().trim() || '';
      
      const roommatesText = clientDataRow[5]?.toString().trim().toLowerCase();
      versionData.roommates = roommatesText === 'yes' || roommatesText === 'y';
      versionData.totalRoommates = parseInt(clientDataRow[6]?.toString()) || 0;
    }

    // Parse Sales Representative from cell C6 for V3 and V4 files
    if ((version === 'v3' || version === 'v4') && rows[5] && rows[5][2]) {
      versionData.salesRep = rows[5][2]?.toString().trim() || '';
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

      if (lastNameIndex >= 0) versionData.last_name = personalDataRow[lastNameIndex]?.toString().trim() || '';
      if (firstNameIndex >= 0) versionData.first_name = personalDataRow[firstNameIndex]?.toString().trim() || '';
      if (tdyLocationIndex >= 0) versionData.tdy_location = personalDataRow[tdyLocationIndex]?.toString().trim() || '';
      if (contractStartIndex >= 0) versionData.contract_start = parseDate(personalDataRow[contractStartIndex]);
      if (contractEndIndex >= 0) versionData.contract_end = parseDate(personalDataRow[contractEndIndex]);
      if (govAgencyIndex >= 0) versionData.agency_department = personalDataRow[govAgencyIndex]?.toString().trim() || '';
      if (cellIndex >= 0) versionData.cell = personalDataRow[cellIndex]?.toString().trim() || '';
      if (emailIndex >= 0) versionData.email = personalDataRow[emailIndex]?.toString().trim() || '';
      if (govEmailIndex >= 0) versionData.gov_email = personalDataRow[govEmailIndex]?.toString().trim() || '';
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
      uid: generateUID(),
      isInV2: version === 'v2',
      isInV3: version === 'v3',
      isInV4: version === 'v4',
      isInMasterAccounting: false,
      
      // Set version-specific data
      [version.toUpperCase()]: versionData,
      
      // Root level fields
      first_name: versionData.first_name,
      last_name: versionData.last_name,
      email: versionData.email,
      gov_email: versionData.gov_email,
      cell: versionData.cell,
      tdy_location: versionData.tdy_location,
      agency_department: versionData.agency_department,
      tdy_type: versionData.tdy_type,
      deal_type: versionData.deal_type,
      contract_status: versionData.contract_status,
      roommates: versionData.roommates,
      totalRoommates: versionData.totalRoommates,
      orders_start: versionData.orders_start,
      orders_end: versionData.orders_end,
      traveler_start: versionData.traveler_start,
      traveler_end: versionData.traveler_end,
      efm_1_start: versionData.efm_1_start,
      efm_1_end: versionData.efm_1_end,
      efm_1_age: versionData.efm_1_age,
      efm_2_start: versionData.efm_2_start,
      efm_2_end: versionData.efm_2_end,
      efm_2_age: versionData.efm_2_age,
      efm_3_start: versionData.efm_3_start,
      efm_3_end: versionData.efm_3_end,
      efm_3_age: versionData.efm_3_age,
      efm_4_start: versionData.efm_4_start,
      efm_4_end: versionData.efm_4_end,
      efm_4_age: versionData.efm_4_age,
      efm_5_start: versionData.efm_5_start,
      efm_5_end: versionData.efm_5_end,
      efm_5_age: versionData.efm_5_age,
      efm_6_start: versionData.efm_6_start,
      efm_6_end: versionData.efm_6_end,
      efm_6_age: versionData.efm_6_age,
      avg_monthly_per_diem: versionData.avg_monthly_per_diem,
      lowest_nightly_rate: versionData.lowest_nightly_rate,
      total_rental_bill_w_tax: versionData.total_rental_bill_w_tax,
      total_furniture_rental_bill: versionData.total_furniture_rental_bill,
      furniture_spend_amount: versionData.furniture_spend_amount,
      liquidation_price: versionData.liquidation_price,
      billing_address: versionData.billingAddress,
      billing_city: versionData.billingCity,
      billing_state: versionData.billingState,
      billing_zip: versionData.billingZip,
      total_lodging_allocation: versionData.total_lodging_allocation,
      transaction_fees: versionData.transaction_fees,
      net: versionData.net,
      min_per_diem_night: versionData.min_per_diem_night,
      max_nightly_lodging_spend: versionData.max_nightly_lodging_spend,
      min_required_furnishings_spend: versionData.min_required_furnishings_spend,
      total_furniture_spend: versionData.total_furniture_spend,
      logistics_cost: versionData.logistics_cost,
      furnishing_transaction_fees: versionData.furnishing_transaction_fees,
      gross_profit: versionData.gross_profit,
      gross_profit_percentage: versionData.gross_profit_percentage,
      num_nights: versionData.num_nights,
      property_name: versionData.property_name,
      property_url: versionData.property_url,
      first_billing_day: versionData.first_billing_day,
      last_billing_day: versionData.last_billing_day,
      comments: '',
      
      createdAt: now,
      updatedAt: now,
    };

    return client;
  };

  // Parse master accounting file (adapted from MasterAccountingParser)
  const parseMasterAccounting = (rows: any[][]): Client[] => {
    const clients: Client[] = [];
    
    console.log('Starting Master Accounting parsing, total rows:', rows.length);

    // First, find the header row with "First" and "Last" columns
    let headerRowIndex = -1;
    let firstNameColumnIndex = -1;
    let lastNameColumnIndex = -1;

    for (let i = 0; i < Math.min(50, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;

      // Look for header row containing "First" and "Last"
      const firstIndex = row.findIndex(cell => 
        cell && typeof cell === 'string' && cell.toString().toLowerCase().includes('first')
      );
      const lastIndex = row.findIndex(cell => 
        cell && typeof cell === 'string' && cell.toString().toLowerCase().includes('last')
      );

      if (firstIndex >= 0 && lastIndex >= 0) {
        headerRowIndex = i;
        firstNameColumnIndex = firstIndex;
        lastNameColumnIndex = lastIndex;
        console.log(`Found header row at index ${i}, First column: ${firstIndex}, Last column: ${lastIndex}`);
        break;
      }
    }

    // Extract monthly period headers from Row 13 (index 12), columns L-AU (indexes 11-46)
    const monthlyHeaders: string[] = [];
    if (rows[12]) { // Row 13 (0-indexed as 12)
      for (let col = 11; col <= 46; col++) { // Columns L-AU (L=11, AU=46)
        const header = rows[12][col]?.toString().trim() || '';
        monthlyHeaders.push(header);
      }
    }
    console.log('Monthly period headers found:', monthlyHeaders.filter(h => h.length > 0));

    // Master Accounting clients start at row 46 (index 45) and consist of 8-row sections
    const startRowIndex = 45; // Row 46 in 1-based indexing
    const rowsPerClient = 8;
    
    console.log(`Starting to parse Master Accounting clients from row ${startRowIndex + 1}`);

    let clientNumber = 1;
    let currentRowIndex = startRowIndex;

    while (currentRowIndex + rowsPerClient <= rows.length) {
      console.log(`Processing client section starting at row ${currentRowIndex + 1}`);
      
      // Extract the 8-row section for this client
      const clientSection = [];
      for (let i = 0; i < rowsPerClient; i++) {
        if (rows[currentRowIndex + i]) {
          clientSection.push(rows[currentRowIndex + i]);
        }
      }

      if (clientSection.length === 0) {
        console.log(`No data found in section starting at row ${currentRowIndex + 1}, skipping`);
        currentRowIndex += rowsPerClient;
        clientNumber++;
        continue;
      }

      // Check if this section contains actual client data
      // Look for any non-empty cells in columns B, C, or D
      const hasData = clientSection.some(row => 
        (row[1] && row[1].toString().trim()) || 
        (row[2] && row[2].toString().trim()) || 
        (row[3] && row[3].toString().trim())
      );

      if (!hasData) {
        console.log(`Section starting at row ${currentRowIndex + 1} appears to be empty, skipping`);
        currentRowIndex += rowsPerClient;
        clientNumber++;
        continue;
      }

      const masterAccountingData = {
        label: '', // Will be extracted from column B for this client
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
        paymentStatuses: [] as string[],
        billing_details: {} as { [month: string]: {
          payment_status?: string;
          due_date?: string;
          bill?: number;
          tax?: number;
          total_bill?: number;
          paid?: number;
          signed?: string;
          invoiced?: string;
        }}
      };

      // Extract the label from column B (index 1) for this client
      for (const row of clientSection) {
        if (row && row[1] && row[1].toString().trim()) {
          const labelValue = row[1].toString().trim();
          // Only use non-empty, non-header values
          if (labelValue && !isNaN(Number(labelValue))) {
            masterAccountingData.label = labelValue;
            break;
          }
        }
      }

      // Extract names using column headers if found
      if (headerRowIndex >= 0 && firstNameColumnIndex >= 0 && lastNameColumnIndex >= 0) {
        // Look for names in any of the 8 rows for this client
        for (const row of clientSection) {
          if (row[firstNameColumnIndex] && row[lastNameColumnIndex]) {
            const firstName = row[firstNameColumnIndex].toString().trim();
            const lastName = row[lastNameColumnIndex].toString().trim();
            
            // Only use non-empty names that are not the header text itself
            if (firstName && lastName && 
                firstName.toLowerCase() !== 'first' && 
                lastName.toLowerCase() !== 'last') {
              masterAccountingData.firstName = firstName;
              masterAccountingData.lastName = lastName;
              console.log(`Found names for client ${clientNumber}: ${firstName} ${lastName}`);
              break;
            }
          }
        }
      }

      // Parse billing details from the 8-row client section
      // The structure within each client section:
      // Row 0: Payment Status for each month (columns L-AU)
      // Row 1: Due Date for each month
      // Row 2: Bill amount for each month  
      // Row 3: Tax amount for each month
      // Row 4: Total Bill for each month
      // Row 5: Paid amount for each month
      // Row 6: Signed status for each month
      // Row 7: Invoiced status for each month

      if (clientSection.length >= 8) {
        const paymentStatusRow = clientSection[0] || [];
        const dueDateRow = clientSection[1] || [];
        const billRow = clientSection[2] || [];
        const taxRow = clientSection[3] || [];
        const totalBillRow = clientSection[4] || [];
        const paidRow = clientSection[5] || [];
        const signedRow = clientSection[6] || [];
        const invoicedRow = clientSection[7] || [];

        // Process each month (columns L-AU, indexes 11-46)
        for (let col = 11; col <= 46; col++) {
          const monthIndex = col - 11; // Convert to 0-based index for monthlyHeaders
          const monthHeader = monthlyHeaders[monthIndex];
          
          if (monthHeader && monthHeader.trim()) {
            const monthData: any = {};
            
            // Extract data for this month from each row
            const paymentStatus = paymentStatusRow[col]?.toString().trim();
            const dueDate = dueDateRow[col]?.toString().trim();
            const bill = billRow[col];
            const tax = taxRow[col];
            const totalBill = totalBillRow[col];
            const paid = paidRow[col];
            const signed = signedRow[col]?.toString().trim();
            const invoiced = invoicedRow[col]?.toString().trim();

            // Only add data if there's meaningful content
            if (paymentStatus) monthData.payment_status = paymentStatus;
            if (dueDate) monthData.due_date = dueDate;
            if (bill !== undefined && bill !== null && bill !== '') {
              monthData.bill = parseFloat(bill.toString().replace(/[^\d.-]/g, '')) || 0;
            }
            if (tax !== undefined && tax !== null && tax !== '') {
              monthData.tax = parseFloat(tax.toString().replace(/[^\d.-]/g, '')) || 0;
            }
            if (totalBill !== undefined && totalBill !== null && totalBill !== '') {
              monthData.total_bill = parseFloat(totalBill.toString().replace(/[^\d.-]/g, '')) || 0;
            }
            if (paid !== undefined && paid !== null && paid !== '') {
              monthData.paid = parseFloat(paid.toString().replace(/[^\d.-]/g, '')) || 0;
            }
            if (signed) monthData.signed = signed;
            if (invoiced) monthData.invoiced = invoiced;

            // Only add month data if there's at least one meaningful field
            if (Object.keys(monthData).length > 0) {
              masterAccountingData.billing_details[monthHeader] = monthData;
            }
          }
        }

        console.log(`Extracted billing details for client ${clientNumber}:`, {
          label: masterAccountingData.label,
          monthsWithData: Object.keys(masterAccountingData.billing_details).length,
          monthHeaders: Object.keys(masterAccountingData.billing_details)
        });
      }

      // Extract other data from the client section
      for (let i = 0; i < clientSection.length; i++) {
        const row = clientSection[i];
        if (!row) continue;

        // Extract sales notes from column D (index 3)
        if (row[3] && typeof row[3] === 'string' && row[3].trim()) {
          if (!masterAccountingData.salesNotes) {
            masterAccountingData.salesNotes = row[3].toString().trim();
          }
        }

        // Look for payment statuses
        const statusIndex = row.findIndex(cell => 
          cell && typeof cell === 'string' && cell.toString().toLowerCase().includes('status')
        );
        if (statusIndex >= 0) {
          for (let j = statusIndex + 1; j < row.length; j++) {
            const status = row[j];
            if (status && typeof status === 'string' && status.trim()) {
              masterAccountingData.paymentStatuses.push(status.toString().trim());
            }
          }
        }

        // Look for tax information
        if (row.some(cell => cell && cell.toString().toLowerCase().includes('contract tax'))) {
          const taxIndex = row.findIndex(cell => 
            cell && cell.toString().toLowerCase().includes('contract tax')
          );
          if (taxIndex >= 0 && row[taxIndex + 1]) {
            masterAccountingData.contractTaxRate = parseFloat(row[taxIndex + 1]) || 0;
          }
        }

        if (row.some(cell => cell && cell.toString().toLowerCase().includes('liquidation tax'))) {
          const taxIndex = row.findIndex(cell => 
            cell && cell.toString().toLowerCase().includes('liquidation tax')
          );
          if (taxIndex >= 0 && row[taxIndex + 1]) {
            masterAccountingData.liquidationTaxRate = parseFloat(row[taxIndex + 1]) || 0;
          }
        }
      }

      const now = new Date().toISOString();
      const client: Client = {
        uid: generateUID(),
        isInV2: false,
        isInV3: false,
        isInV4: false,
        isInMasterAccounting: true,
        
        master_accounting: masterAccountingData,
        
        first_name: masterAccountingData.firstName,
        last_name: masterAccountingData.lastName,
        liquidationTaxRate: masterAccountingData.liquidationTaxRate,
        
        createdAt: now,
        updatedAt: now,
      };

      console.log(`Created Master Accounting client ${clientNumber}:`, {
        clientNumber: clientNumber,
        first_name: client.first_name,
        last_name: client.last_name,
        uid: client.uid,
        rowRange: `${currentRowIndex + 1}-${currentRowIndex + rowsPerClient}`,
        billingMonths: Object.keys(masterAccountingData.billing_details).length
      });

      clients.push(client);

      // Move to next client section
      currentRowIndex += rowsPerClient;
      clientNumber++;

      // Handle gaps/hidden lines - look for the next section with data
      let foundNextSection = false;
      const maxGapRows = 20; // Don't search too far ahead
      
      for (let gap = 0; gap < maxGapRows; gap++) {
        const nextSectionStart = currentRowIndex + gap;
        if (nextSectionStart + rowsPerClient > rows.length) break;

        // Check if this potential next section has data
        let hasNextData = false;
        for (let i = 0; i < rowsPerClient; i++) {
          const checkRow = rows[nextSectionStart + i];
          if (checkRow && (
            (checkRow[1] && checkRow[1].toString().trim()) || 
            (checkRow[2] && checkRow[2].toString().trim()) || 
            (checkRow[3] && checkRow[3].toString().trim())
          )) {
            hasNextData = true;
            break;
          }
        }

        if (hasNextData) {
          currentRowIndex = nextSectionStart;
          foundNextSection = true;
          console.log(`Found next client section at row ${currentRowIndex + 1} (gap of ${gap} rows)`);
          break;
        }
      }

      if (!foundNextSection) {
        console.log(`No more client sections found after row ${currentRowIndex + 1}, ending parsing`);
        break;
      }
    }

    console.log(`Master Accounting parsing complete. Found ${clients.length} clients.`);
    return clients;
  };

  // Merge clients with same first and last name
  const mergeClients = (newClients: Client[]): Client[] => {
    const clientMap = new Map<string, Client>();

    // Merge new clients
    newClients.forEach(newClient => {
      // Create a client key - use name if available, otherwise use UID for unique entries
      let clientKey: string;
      
      if (newClient.first_name || newClient.last_name) {
        clientKey = getClientKey(newClient.first_name, newClient.last_name);
      } else {
        // For clients without names (like some Master Accounting entries), use UID as key
        clientKey = `no_name_${newClient.uid}`;
        console.log('Client without name found:', newClient);
      }
      
      const existing = clientMap.get(clientKey);
      
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
          first_name: newClient.first_name || existing.first_name,
          last_name: newClient.last_name || existing.last_name,
          email: newClient.email || existing.email,
          gov_email: newClient.gov_email || existing.gov_email,
          cell: newClient.cell || existing.cell,
          tdy_location: newClient.tdy_location || existing.tdy_location,
          agency_department: newClient.agency_department || existing.agency_department,
          contract_status: newClient.contract_status || existing.contract_status,
          roommates: newClient.roommates !== undefined ? newClient.roommates : existing.roommates,
          totalRoommates: newClient.totalRoommates || existing.totalRoommates,
          orders_start: newClient.orders_start || existing.orders_start,
          orders_end: newClient.orders_end || existing.orders_end,
          traveler_start: newClient.traveler_start || existing.traveler_start,
          traveler_end: newClient.traveler_end || existing.traveler_end,
          efm_1_start: newClient.efm_1_start || existing.efm_1_start,
          efm_1_end: newClient.efm_1_end || existing.efm_1_end,
          efm_1_age: newClient.efm_1_age || existing.efm_1_age,
          efm_2_start: newClient.efm_2_start || existing.efm_2_start,
          efm_2_end: newClient.efm_2_end || existing.efm_2_end,
          efm_2_age: newClient.efm_2_age || existing.efm_2_age,
          efm_3_start: newClient.efm_3_start || existing.efm_3_start,
          efm_3_end: newClient.efm_3_end || existing.efm_3_end,
          efm_3_age: newClient.efm_3_age || existing.efm_3_age,
          efm_4_start: newClient.efm_4_start || existing.efm_4_start,
          efm_4_end: newClient.efm_4_end || existing.efm_4_end,
          efm_4_age: newClient.efm_4_age || existing.efm_4_age,
          efm_5_start: newClient.efm_5_start || existing.efm_5_start,
          efm_5_end: newClient.efm_5_end || existing.efm_5_end,
          efm_5_age: newClient.efm_5_age || existing.efm_5_age,
          efm_6_start: newClient.efm_6_start || existing.efm_6_start,
          efm_6_end: newClient.efm_6_end || existing.efm_6_end,
          efm_6_age: newClient.efm_6_age || existing.efm_6_age,
          avg_monthly_per_diem: newClient.avg_monthly_per_diem || existing.avg_monthly_per_diem,
          lowest_nightly_rate: newClient.lowest_nightly_rate || existing.lowest_nightly_rate,
          total_rental_bill_w_tax: newClient.total_rental_bill_w_tax || existing.total_rental_bill_w_tax,
          total_furniture_rental_bill: newClient.total_furniture_rental_bill || existing.total_furniture_rental_bill,
          furniture_spend_amount: newClient.furniture_spend_amount || existing.furniture_spend_amount,
          liquidation_price: newClient.liquidation_price || existing.liquidation_price,
          billing_address: newClient.billing_address || existing.billing_address,
          billing_city: newClient.billing_city || existing.billing_city,
          billing_state: newClient.billing_state || existing.billing_state,
          billing_zip: newClient.billing_zip || existing.billing_zip,
          total_lodging_allocation: newClient.total_lodging_allocation || existing.total_lodging_allocation,
          transaction_fees: newClient.transaction_fees || existing.transaction_fees,
          net: newClient.net || existing.net,
          min_per_diem_night: newClient.min_per_diem_night || existing.min_per_diem_night,
          max_nightly_lodging_spend: newClient.max_nightly_lodging_spend || existing.max_nightly_lodging_spend,
          min_required_furnishings_spend: newClient.min_required_furnishings_spend || existing.min_required_furnishings_spend,
          total_furniture_spend: newClient.total_furniture_spend || existing.total_furniture_spend,
          logistics_cost: newClient.logistics_cost || existing.logistics_cost,
          furnishing_transaction_fees: newClient.furnishing_transaction_fees || existing.furnishing_transaction_fees,
          gross_profit: newClient.gross_profit || existing.gross_profit,
          gross_profit_percentage: newClient.gross_profit_percentage || existing.gross_profit_percentage,
          num_nights: newClient.num_nights || existing.num_nights,
          property_name: newClient.property_name || existing.property_name,
          property_url: newClient.property_url || existing.property_url,
          first_billing_day: newClient.first_billing_day || existing.first_billing_day,
          last_billing_day: newClient.last_billing_day || existing.last_billing_day,
          comments: newClient.comments || existing.comments,
          
          updatedAt: new Date().toISOString(),
        };
        
        clientMap.set(clientKey, merged);
      } else {
        clientMap.set(clientKey, newClient);
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => {
      // Sort by last name, then first name, with unnamed clients at the end
      if (!a.last_name && !a.first_name && (b.last_name || b.first_name)) return 1;
      if (!b.last_name && !b.first_name && (a.last_name || a.first_name)) return -1;
      if (!a.last_name && !a.first_name && !b.last_name && !b.first_name) {
        // Sort unnamed clients by their master accounting label if available
        const aLabel = a.master_accounting?.label || '';
        const bLabel = b.master_accounting?.label || '';
        return aLabel.localeCompare(bLabel);
      }
      
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
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
        // Parse V2/V3/V4 with multiple tabs using the new cell mapping
        let newClients: Client[] = [];
        
        if (fileType === 'v2') {
          newClients = parseV2File(workbook);
        } else if (fileType === 'v3') {
          newClients = parseV3File(workbook);
        } else if (fileType === 'v4') {
          newClients = parseV4File(workbook);
        }
        
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
    
    console.log('Compiling client list:', {
      v2Count: fileData.v2.length,
      v3Count: fileData.v3.length,
      v4Count: fileData.v4.length,
      masterAccountingCount: fileData.master_accounting.length,
      totalBeforeMerge: allClients.length
    });
    
    // Log Master Accounting clients before merge
    const masterAccountingClients = fileData.master_accounting;
    console.log('Master Accounting clients before merge:', masterAccountingClients.map(c => ({
      uid: c.uid,
      first_name: c.first_name,
      last_name: c.last_name,
      isInMasterAccounting: c.isInMasterAccounting,
      master_accounting: c.master_accounting
    })));
    
    const mergedClients = mergeClients(allClients);
    
    console.log('After merge:', {
      totalAfterMerge: mergedClients.length,
      masterAccountingInMerged: mergedClients.filter(c => c.isInMasterAccounting).length
    });
    
    // Filter out empty clients after merge (clients with only UID and version flags)
    const filteredClients = mergedClients.filter(client => {
      const hasData = hasMeaningfulData(client);
      if (!hasData) {
        console.log('Removing empty client after merge:', {
          uid: client.uid.slice(-8),
          first_name: client.first_name || 'empty',
          last_name: client.last_name || 'empty',
          versions: [
            client.isInV2 && 'V2',
            client.isInV3 && 'V3', 
            client.isInV4 && 'V4',
            client.isInMasterAccounting && 'MA'
          ].filter(Boolean).join(', ')
        });
      }
      return hasData;
    });
    
    console.log('After filtering empty clients:', {
      beforeFiltering: mergedClients.length,
      afterFiltering: filteredClients.length,
      removed: mergedClients.length - filteredClients.length
    });
    
    setClients(filteredClients);
    onClientsUpdated?.(filteredClients);
  };

  // Check if all files are uploaded
  const allFilesUploaded = uploadedFiles.v2 && uploadedFiles.v3 && uploadedFiles.v4 && uploadedFiles.master_accounting;

  // Reset all data and return to file upload state
  const resetAll = () => {
    if (clients.length > 0) {
      if (!confirm('Are you sure you want to reset? This will clear all uploaded files and parsed client data.')) {
        return;
      }
    }
    
    // Clear all state
    setClients([]);
    setUploadedFiles({
      v2: false,
      v3: false,
      v4: false,
      master_accounting: false
    });
    setFileData({
      v2: [],
      v3: [],
      v4: [],
      master_accounting: []
    });
    setEditingStates({});
    setEditedData({});
    setExpandedRows({});
    setCreatingInDatabase(false);
    setLoading(false); // Reset loading state
    
    // Clear all file input elements
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => {
      input.value = '';
    });
    
    // Notify parent component
    onClientsUpdated?.([]);
    
    console.log('All data reset - returned to file upload state');
  };

  // Edit functions
  const startEditing = (uid: string) => {
    setEditingStates(prev => ({ ...prev, [uid]: true }));
  };

  const cancelEditing = (uid: string) => {
    setEditingStates(prev => ({ ...prev, [uid]: false }));
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[uid];
      return newData;
    });
  };

  const saveEditing = (uid: string) => {
    const edits = editedData[uid];
    if (edits) {
      setClients(prev => prev.map(client => 
        client.uid === uid 
          ? { ...client, ...edits, updatedAt: new Date().toISOString() }
          : client
      ));
    }
    
    setEditingStates(prev => ({ ...prev, [uid]: false }));
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[uid];
      return newData;
    });
  };

  const updateField = (uid: string, field: keyof Client, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [field]: value
      }
    }));
  };

  const getDisplayValue = (client: Client, field: keyof Client) => {
    const edited = editedData[client.uid];
    if (edited && edited[field] !== undefined) {
      return edited[field];
    }
    return client[field];
  };

  // Expand/collapse functions
  const toggleExpansion = (uid: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
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

  // Delete a client from the list
  const deleteClient = (uid: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete client ${clientName}?`)) {
      setClients(prev => {
        const updated = prev.filter(client => client.uid !== uid);
        onClientsUpdated?.(updated);
        return updated;
      });
      
      // Clean up any editing states for this client
      setEditingStates(prev => {
        const newStates = { ...prev };
        delete newStates[uid];
        return newStates;
      });
      
      setEditedData(prev => {
        const newData = { ...prev };
        delete newData[uid];
        return newData;
      });
      
      setExpandedRows(prev => {
        const newRows = { ...prev };
        delete newRows[uid];
        return newRows;
      });
    }
  };

  // Create clients in Firestore database
  const createClientsInDatabase = async () => {
    if (clients.length === 0) {
      alert('No clients to create in database');
      return;
    }

    if (!confirm(`Are you sure you want to create ${clients.length} clients in the database?`)) {
      return;
    }

    setCreatingInDatabase(true);
    
    try {
      const clientsCollection = collection(db, 'clients');
      let successCount = 0;
      let errorCount = 0;

      for (const client of clients) {
        try {
          // Prepare client data for Firestore (remove internal React state fields)
          const clientData = {
            // Unique identifier
            uid: client.uid,
            
            // Version tracking flags
            isInV2: client.isInV2,
            isInV3: client.isInV3,
            isInV4: client.isInV4,
            isInMasterAccounting: client.isInMasterAccounting,
            
            // Version-specific data
            V2: client.V2 || null,
            V3: client.V3 || null,
            V4: client.V4 || null,
            master_accounting: client.master_accounting || null,
            
            // Root level fields
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email || null,
            gov_email: client.gov_email || null,
            cell: client.cell || null,
            tdy_location: client.tdy_location || null,
            agency_department: client.agency_department || null,
            contract_status: client.contract_status || null,
            roommates: client.roommates || false,
            totalRoommates: client.totalRoommates || 0,
            orders_start: client.orders_start || null,
            orders_end: client.orders_end || null,
            traveler_start: client.traveler_start || null,
            traveler_end: client.traveler_end || null,
            efm_1_start: client.efm_1_start || null,
            efm_1_end: client.efm_1_end || null,
            efm_1_age: client.efm_1_age || 0,
            efm_2_start: client.efm_2_start || null,
            efm_2_end: client.efm_2_end || null,
            efm_2_age: client.efm_2_age || 0,
            efm_3_start: client.efm_3_start || null,
            efm_3_end: client.efm_3_end || null,
            efm_3_age: client.efm_3_age || 0,
            efm_4_start: client.efm_4_start || null,
            efm_4_end: client.efm_4_end || null,
            efm_4_age: client.efm_4_age || 0,
            efm_5_start: client.efm_5_start || null,
            efm_5_end: client.efm_5_end || null,
            efm_5_age: client.efm_5_age || 0,
            efm_6_start: client.efm_6_start || null,
            efm_6_end: client.efm_6_end || null,
            efm_6_age: client.efm_6_age || 0,
            avg_monthly_per_diem: client.avg_monthly_per_diem || 0,
            lowest_nightly_rate: client.lowest_nightly_rate || 0,
            total_rental_bill_w_tax: client.total_rental_bill_w_tax || 0,
            total_furniture_rental_bill: client.total_furniture_rental_bill || 0,
            furniture_spend_amount: client.furniture_spend_amount || 0,
            liquidation_price: client.liquidation_price || 0,
            billing_address: client.billing_address || null,
            billing_city: client.billing_city || null,
            billing_state: client.billing_state || null,
            billing_zip: client.billing_zip || null,
            total_lodging_allocation: client.total_lodging_allocation || 0,
            transaction_fees: client.transaction_fees || 0,
            net: client.net || 0,
            min_per_diem_night: client.min_per_diem_night || 0,
            max_nightly_lodging_spend: client.max_nightly_lodging_spend || 0,
            min_required_furnishings_spend: client.min_required_furnishings_spend || 0,
            total_furniture_spend: client.total_furniture_spend || 0,
            logistics_cost: client.logistics_cost || 0,
            furnishing_transaction_fees: client.furnishing_transaction_fees || 0,
            gross_profit: client.gross_profit || 0,
            gross_profit_percentage: client.gross_profit_percentage || 0,
            num_nights: client.num_nights || 0,
            property_name: client.property_name || null,
            property_url: client.property_url || null,
            first_billing_day: client.first_billing_day || null,
            last_billing_day: client.last_billing_day || null,
            comments: client.comments || '',
            
            // Metadata with server timestamp
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            importedAt: serverTimestamp()
          };

          // Use UID as document ID for easier lookups
          await setDoc(doc(clientsCollection, client.uid), clientData);
          successCount++;
          
        } catch (error) {
          console.error(`Error creating client ${client.first_name} ${client.last_name}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (errorCount === 0) {
        alert(`Successfully created ${successCount} clients in the database!`);
      } else {
        alert(`Created ${successCount} clients successfully. ${errorCount} failed to create.`);
      }

    } catch (error) {
      console.error('Error creating clients in database:', error);
      alert('An error occurred while creating clients in the database. Please try again.');
    } finally {
      setCreatingInDatabase(false);
    }
  };

  // Export clients to CSV
  const exportToCSV = () => {
    if (clients.length === 0) {
      alert('No clients to export');
      return;
    }

    // Get all unique billing months across all clients for comprehensive headers
    const allBillingMonths = new Set<string>();
    clients.forEach(client => {
      if (client.master_accounting?.billing_details) {
        Object.keys(client.master_accounting.billing_details).forEach(month => {
          allBillingMonths.add(month);
        });
      }
    });
    const sortedBillingMonths = Array.from(allBillingMonths).sort();

    // Define comprehensive CSV headers based on cell mapping
    const headers = [
      // Basic Info
      'UID',
      'First Name',
      'Last Name',
      'Email',
      'Government Email',
      'Cell',
      'TDY Location',
      'Government Agency/Department',
      
      // Contract Information
      'Contract Start Date',
      'Contract End Date',
      'Contract Value',
      'Contract Status',
      
      // TDY Information
      'TDY Type',
      'Deal Type',
      'Client Worksheet URL',
      'Roommates',
      
      // Date Information
      'Orders Start Date',
      'Orders End Date',
      'Travel Start Date',
      'Travel End Date',
      
      // EFM Information
      'EFM 1 Start Date',
      'EFM 1 End Date',
      'EFM 1 Age',
      'EFM 2 Start Date',
      'EFM 2 End Date',
      'EFM 2 Age',
      'EFM 3 Start Date',
      'EFM 3 End Date',
      'EFM 3 Age',
      'EFM 4 Start Date',
      'EFM 4 End Date',
      'EFM 4 Age',
      'EFM 5 Start Date',
      'EFM 5 End Date',
      'EFM 5 Age',
      'EFM 6 Start Date',
      'EFM 6 End Date',
      'EFM 6 Age',
      
      // Financial Information
      'Average Monthly Per Diem',
      'Lowest Nightly Rate',
      'Total Rental Bill with Tax',
      'Total Furniture Rental Bill',
      'Furniture Spend Amount',
      'Liquidation Price',
      
      // Billing Information
      'Billing Address',
      'Billing City',
      'Billing State',
      'Billing ZIP',
      
      // V3/V4 Only Fields
      'Total Lodging Allocation',
      'Transaction Fees',
      'NET',
      'Min Per Diem Night',
      'Max Nightly Lodging Spend',
      'Min Required Furnishings Spend',
      'Total Furniture Spend',
      'Logistics Cost',
      'Furnishing Transaction Fees',
      'Gross Profit',
      'Gross Profit Percentage',
      'Number of Nights',
      'Property Name',
      'Property URL',
      
      // Billing Days
      'First Billing Day',
      'Last Billing Day',
      
      // Additional Fields
      'Sales Rep',
      'Comments',
      
      // Version Tracking
      'In V2',
      'V2 Label',
      'In V3',
      'V3 Label',
      'In V4',
      'V4 Label',
      'In Master Accounting',
      'Master Accounting Label',
      
      // Master Accounting Additional Data
      'Contract Tax Rate',
      'Liquidation Tax Rate',
      'Sales Notes',
      
      // Monthly Billing Details - Dynamic columns for each month
      ...sortedBillingMonths.flatMap(month => [
        `${month} - Payment Status`,
        `${month} - Due Date`,
        `${month} - Bill Amount`,
        `${month} - Tax Amount`,
        `${month} - Total Bill`,
        `${month} - Paid Amount`,
        `${month} - Signed`,
        `${month} - Invoiced`
      ]),
      
      // Metadata
      'Created At',
      'Updated At'
    ];

    // Convert clients to comprehensive CSV rows
    const csvRows = clients.map(client => [
      // Basic Info
      client.uid,
      client.first_name || '',
      client.last_name || '',
      client.email || '',
      client.gov_email || '',
      client.cell || '',
      client.tdy_location || '',
      client.agency_department || '',
      
      // Contract Information
      client.contract_start ? formatDate(client.contract_start) : '',
      client.contract_end ? formatDate(client.contract_end) : '',
      client.contract_value || 0,
      client.contract_status || '',
      
      // TDY Information
      client.tdy_type || '',
      client.deal_type || '',
      client.client_ws_url || '',
      client.roommates ? 'Yes' : 'No',
      
      // Date Information
      client.orders_start ? formatDate(client.orders_start) : '',
      client.orders_end ? formatDate(client.orders_end) : '',
      client.traveler_start ? formatDate(client.traveler_start) : '',
      client.traveler_end ? formatDate(client.traveler_end) : '',
      
      // EFM Information
      client.efm_1_start ? formatDate(client.efm_1_start) : '',
      client.efm_1_end ? formatDate(client.efm_1_end) : '',
      client.efm_1_age || 0,
      client.efm_2_start ? formatDate(client.efm_2_start) : '',
      client.efm_2_end ? formatDate(client.efm_2_end) : '',
      client.efm_2_age || 0,
      client.efm_3_start ? formatDate(client.efm_3_start) : '',
      client.efm_3_end ? formatDate(client.efm_3_end) : '',
      client.efm_3_age || 0,
      client.efm_4_start ? formatDate(client.efm_4_start) : '',
      client.efm_4_end ? formatDate(client.efm_4_end) : '',
      client.efm_4_age || 0,
      client.efm_5_start ? formatDate(client.efm_5_start) : '',
      client.efm_5_end ? formatDate(client.efm_5_end) : '',
      client.efm_5_age || 0,
      client.efm_6_start ? formatDate(client.efm_6_start) : '',
      client.efm_6_end ? formatDate(client.efm_6_end) : '',
      client.efm_6_age || 0,
      
      // Financial Information
      client.avg_monthly_per_diem || 0,
      client.lowest_nightly_rate || 0,
      client.total_rental_bill_w_tax || 0,
      client.total_furniture_rental_bill || 0,
      client.furniture_spend_amount || 0,
      client.liquidation_price || 0,
      
      // Billing Information
      client.billing_address || '',
      client.billing_city || '',
      client.billing_state || '',
      client.billing_zip || '',
      
      // V3/V4 Only Fields
      client.total_lodging_allocation || 0,
      client.transaction_fees || 0,
      client.net || 0,
      client.min_per_diem_night || 0,
      client.max_nightly_lodging_spend || 0,
      client.min_required_furnishings_spend || 0,
      client.total_furniture_spend || 0,
      client.logistics_cost || 0,
      client.furnishing_transaction_fees || 0,
      client.gross_profit || 0,
      client.gross_profit_percentage || 0,
      client.num_nights || 0,
      client.property_name || '',
      client.property_url || '',
      
      // Billing Days
      client.first_billing_day ? formatDate(client.first_billing_day) : '',
      client.last_billing_day ? formatDate(client.last_billing_day) : '',
      
      // Additional Fields
      client.salesRep || '',
      client.comments || '',
      
      // Version Tracking
      client.isInV2 ? 'Yes' : 'No',
      client.V2?.label || '',
      client.isInV3 ? 'Yes' : 'No',
      client.V3?.label || '',
      client.isInV4 ? 'Yes' : 'No',
      client.V4?.label || '',
      client.isInMasterAccounting ? 'Yes' : 'No',
      client.master_accounting?.label || '',
      
      // Master Accounting Additional Data
      client.master_accounting?.contractTaxRate || 0,
      client.master_accounting?.liquidationTaxRate || 0,
      client.master_accounting?.salesNotes || '',
      
      // Monthly Billing Details - Dynamic columns for each month
      ...sortedBillingMonths.flatMap(month => {
        const monthData = client.master_accounting?.billing_details?.[month];
        return [
          monthData?.payment_status || '',
          monthData?.due_date || '',
          monthData?.bill || 0,
          monthData?.tax || 0,
          monthData?.total_bill || 0,
          monthData?.paid || 0,
          monthData?.signed || '',
          monthData?.invoiced || ''
        ];
      }),
      
      // Metadata
      client.createdAt ? formatDate(client.createdAt) : '',
      client.updatedAt ? formatDate(client.updatedAt) : ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        row.map(cell => {
          // Escape cells that contain commas, quotes, or newlines
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tdy-clients-comprehensive-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper function to generate a unique ID
  const generateUID = (): string => {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Helper function to create a client key for merging (firstName + lastName)
  const getClientKey = (firstName: string, lastName: string): string => {
    return `${firstName.trim().toLowerCase()}_${lastName.trim().toLowerCase()}`;
  };

  // Sorting function
  const handleSort = (field: 'last_name' | 'contract_start' | 'contract_end') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get filtered and sorted clients
  const getFilteredAndSortedClients = () => {
    let filteredClients = clients;

    // Apply version filter
    if (filters.versions.length > 0) {
      filteredClients = filteredClients.filter(client => {
        return filters.versions.some(version => {
          switch (version) {
            case 'V2': return client.isInV2;
            case 'V3': return client.isInV3;
            case 'V4': return client.isInV4;
            case 'MA': return client.isInMasterAccounting;
            default: return false;
          }
        });
      });
    }

    // Apply TDY type filter
    if (filters.tdyType) {
      filteredClients = filteredClients.filter(client => 
        client.tdy_type?.toLowerCase().includes(filters.tdyType.toLowerCase())
      );
    }

    // Apply deal type filter
    if (filters.dealType) {
      filteredClients = filteredClients.filter(client => 
        client.deal_type?.toLowerCase().includes(filters.dealType.toLowerCase())
      );
    }

    // Apply sorting
    if (sortBy) {
      filteredClients = [...filteredClients].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'last_name':
            aValue = a.last_name || '';
            bValue = b.last_name || '';
            break;
          case 'contract_start':
            aValue = a.contract_start || '';
            bValue = b.contract_start || '';
            break;
          case 'contract_end':
            aValue = a.contract_end || '';
            bValue = b.contract_end || '';
            break;
          default:
            return 0;
        }

        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filteredClients;
  };

  // Get unique values for filter options
  const getUniqueValues = (field: 'tdy_type' | 'deal_type') => {
    const values = clients
      .map(client => client[field])
      .filter(value => value && value.trim())
      .map(value => value!.trim());
    return [...new Set(values)].sort();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
        Client Data Management
      </Typography>
      
      {/* File Upload Section */}
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon color="primary" />
            File Upload
          </Typography>
          
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 3 
            }}
          >
            {(['v2', 'v3', 'v4', 'master_accounting'] as const).map((fileType) => (
              <Card key={fileType} variant="outlined" sx={{ height: '100%', position: 'relative' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {fileType === 'master_accounting' ? 'Master Accounting' : fileType.toUpperCase()} File
                    {uploadedFiles[fileType] && (
                      <CheckCircleIcon color="success" fontSize="small" />
                    )}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Input
                      type="file"
                      inputProps={{ accept: '.xlsx' }}
                      onChange={(e) => handleFileUpload(e as any, fileType)}
                      sx={{ display: 'none' }}
                      id={`upload-${fileType}`}
                    />
                    <label htmlFor={`upload-${fileType}`}>
                      <Button
                        variant={uploadedFiles[fileType] ? "outlined" : "contained"}
                        component="span"
                        startIcon={uploadedFiles[fileType] ? <CheckCircleIcon /> : <UploadIcon />}
                        color={uploadedFiles[fileType] ? "success" : "primary"}
                        fullWidth
                      >
                        {uploadedFiles[fileType] ? 'Uploaded' : 'Choose File'}
                      </Button>
                    </label>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Compile Button */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={compileClientList}
            disabled={!allFilesUploaded}
            startIcon={<CloudUploadIcon />}
            sx={{
              py: 2,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: 2,
              boxShadow: allFilesUploaded ? 4 : 1,
              minWidth: 300
            }}
          >
            {allFilesUploaded ? 'Compile Client List' : 'Upload All Files First'}
          </Button>
          
          {(Object.values(uploadedFiles).some(Boolean) || clients.length > 0) && (
            <Button
              variant="outlined"
              size="large"
              color="error"
              onClick={resetAll}
              startIcon={<ClearIcon />}
              sx={{
                py: 2,
                px: 3,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                }
              }}
            >
              Reset All
            </Button>
          )}
        </Box>
      </Box>

      {loading && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Parsing files...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Client Table */}
      {clients.length > 0 && (
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Clients ({getFilteredAndSortedClients().length}{clients.length !== getFilteredAndSortedClients().length ? ` of ${clients.length}` : ''})
              </Box>
              <Chip label={`${getFilteredAndSortedClients().length} ${getFilteredAndSortedClients().length !== clients.length ? 'Filtered' : 'Total'}`} color="primary" variant="outlined" />
            </Typography>
            
            {/* Filters */}
            <Card sx={{ mb: 3, boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Filters & Sorting
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, alignItems: 'end' }}>
                  {/* Version Filter */}
                  <FormControl size="small">
                    <InputLabel>Versions</InputLabel>
                    <Select
                      multiple
                      value={filters.versions}
                      onChange={(e) => setFilters(prev => ({ ...prev, versions: e.target.value as string[] }))}
                      input={<OutlinedInput label="Versions" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {['V2', 'V3', 'V4', 'MA'].map((version) => (
                        <MenuItem key={version} value={version}>
                          <Checkbox checked={filters.versions.indexOf(version) > -1} />
                          <ListItemText primary={version} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* TDY Type Filter */}
                  <FormControl size="small">
                    <InputLabel>TDY Type</InputLabel>
                    <Select
                      value={filters.tdyType}
                      onChange={(e) => setFilters(prev => ({ ...prev, tdyType: e.target.value }))}
                      label="TDY Type"
                    >
                      <MenuItem value="">All</MenuItem>
                      {getUniqueValues('tdy_type').map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Deal Type Filter */}
                  <FormControl size="small">
                    <InputLabel>Deal Type</InputLabel>
                    <Select
                      value={filters.dealType}
                      onChange={(e) => setFilters(prev => ({ ...prev, dealType: e.target.value }))}
                      label="Deal Type"
                    >
                      <MenuItem value="">All</MenuItem>
                      {getUniqueValues('deal_type').map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Clear Filters */}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setFilters({ versions: [], tdyType: '', dealType: '' });
                      setSortBy('last_name');
                    }}
                    disabled={filters.versions.length === 0 && !filters.tdyType && !filters.dealType && !sortBy}
                  >
                    Clear All
                  </Button>
                </Box>
              </CardContent>
            </Card>
            
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>Actions</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>UID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                      <TableSortLabel
                        active={sortBy === 'last_name'}
                        direction={sortBy === 'last_name' ? sortOrder : 'asc'}
                        onClick={() => handleSort('last_name')}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>Sales Rep</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>TDY Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>TDY Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>Deal Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                      <TableSortLabel
                        active={sortBy === 'contract_start'}
                        direction={sortBy === 'contract_start' ? sortOrder : 'asc'}
                        onClick={() => handleSort('contract_start')}
                      >
                        Contract Start
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                      <TableSortLabel
                        active={sortBy === 'contract_end'}
                        direction={sortBy === 'contract_end' ? sortOrder : 'asc'}
                        onClick={() => handleSort('contract_end')}
                      >
                        Contract End
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>Versions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredAndSortedClients().map((client) => {
                    const isEditing = editingStates[client.uid];
                    const isExpanded = expandedRows[client.uid];
                    const versions = [
                      client.isInV2 && 'V2',
                      client.isInV3 && 'V3',
                      client.isInV4 && 'V4',
                      client.isInMasterAccounting && 'MA'
                    ].filter(Boolean);

                    // Debug logging for Master Accounting clients
                    if (client.isInMasterAccounting) {
                      console.log('Master Accounting client found in UI:', {
                        uid: client.uid,
                        first_name: client.first_name,
                        last_name: client.last_name,
                        isInMasterAccounting: client.isInMasterAccounting,
                        master_accounting: client.master_accounting,
                        versions: versions
                      });
                    }

                    return (
                      <React.Fragment key={client.uid}>
                        {/* Main Client Row */}
                        <TableRow hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                              {/* Expand/Collapse Button */}
                              <Tooltip title={isExpanded ? "Collapse details" : "Expand details"}>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpansion(client.uid)}
                                  color="primary"
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              </Tooltip>
                              
                              {/* Edit/Save/Cancel Buttons */}
                              {isEditing ? (
                                <>
                                  <Tooltip title="Save changes">
                                    <IconButton
                                      size="small"
                                      onClick={() => saveEditing(client.uid)}
                                      color="success"
                                    >
                                      <SaveIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel editing">
                                    <IconButton
                                      size="small"
                                      onClick={() => cancelEditing(client.uid)}
                                      color="error"
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip title="Edit client">
                                    <IconButton
                                      size="small"
                                      onClick={() => startEditing(client.uid)}
                                      color="primary"
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={`Delete client ${client.first_name} ${client.last_name}`}>
                                    <IconButton
                                      size="small"
                                      onClick={() => deleteClient(client.uid, `${client.first_name} ${client.last_name}`)}
                                      color="error"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Chip label={client.uid.slice(-8)} variant="outlined" size="small" />
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                variant="outlined"
                                value={`${getDisplayValue(client, 'first_name')} ${getDisplayValue(client, 'last_name')}`}
                                onChange={(e) => {
                                  const [firstName, ...lastNameParts] = e.target.value.split(' ');
                                  updateField(client.uid, 'first_name', firstName || '');
                                  updateField(client.uid, 'last_name', lastNameParts.join(' ') || '');
                                }}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2" sx={{ 
                                color: (client.first_name || client.last_name) ? 'text.primary' : 'text.secondary',
                                fontStyle: !(client.first_name || client.last_name) ? 'italic' : 'normal'
                              }}>
                                {`${client.first_name} ${client.last_name}`.trim() || 'No name available'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                type="email"
                                variant="outlined"
                                value={getDisplayValue(client, 'email') || ''}
                                onChange={(e) => updateField(client.uid, 'email', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2" sx={{ color: client.email ? 'text.primary' : 'text.secondary' }}>
                                {client.email || 'No email'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                variant="outlined"
                                value={getDisplayValue(client, 'sales_rep') || ''}
                                onChange={(e) => updateField(client.uid, 'sales_rep', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2">
                                {client.sales_rep || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                variant="outlined"
                                value={getDisplayValue(client, 'tdy_location') || ''}
                                onChange={(e) => updateField(client.uid, 'tdy_location', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2">
                                {client.tdy_location || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                variant="outlined"
                                value={getDisplayValue(client, 'tdy_type') || ''}
                                onChange={(e) => updateField(client.uid, 'tdy_type', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2">
                                {client.tdy_type || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                variant="outlined"
                                value={getDisplayValue(client, 'deal_type') || ''}
                                onChange={(e) => updateField(client.uid, 'deal_type', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2">
                                {client.deal_type || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                type="date"
                                variant="outlined"
                                value={getDisplayValue(client, 'contract_start') ? new Date(getDisplayValue(client, 'contract_start')).toISOString().split('T')[0] : ''}
                                onChange={(e) => updateField(client.uid, 'contract_start', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2">
                                {formatDate(client.contract_start) || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                type="date"
                                variant="outlined"
                                value={getDisplayValue(client, 'contract_end') ? new Date(getDisplayValue(client, 'contract_end')).toISOString().split('T')[0] : ''}
                                onChange={(e) => updateField(client.uid, 'contract_end', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2">
                                {formatDate(client.contract_end) || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {client.isInV2 && client.V2 && (
                                <Chip
                                  label={`V2: ${client.V2.label}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                              {client.isInV3 && client.V3 && (
                                <Chip
                                  label={`V3: ${client.V3.label}`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              )}
                              {client.isInV4 && client.V4 && (
                                <Chip
                                  label={`V4: ${client.V4.label}`}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                              {client.isInMasterAccounting && client.master_accounting && (
                                <Chip
                                  label={`MA: ${client.master_accounting.label}`}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details Row */}
                        <TableRow>
                          <TableCell colSpan={11} sx={{ p: 0, border: 'none' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 3, backgroundColor: 'grey.50' }}>
                                <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                                  Detailed Data for Client #{client.uid.slice(-8)}
                                </Typography>
                                
                                {/* Comments Section */}
                                <Card sx={{ mb: 3, boxShadow: 2 }}>
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                      <CommentIcon />
                                      Comments
                                    </Typography>
                                    <TextField
                                      multiline
                                      rows={3}
                                      fullWidth
                                      variant="outlined"
                                      value={getDisplayValue(client, 'comments') || ''}
                                      onChange={(e) => updateField(client.uid, 'comments', e.target.value)}
                                      placeholder="Add comments or notes about this client..."
                                      sx={{ mb: 2 }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<SaveIcon />}
                                        onClick={() => saveEditing(client.uid)}
                                        color="success"
                                      >
                                        Save Comments
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ClearIcon />}
                                        onClick={() => updateField(client.uid, 'comments', '')}
                                        color="inherit"
                                      >
                                        Clear
                                      </Button>
                                    </Box>
                                  </CardContent>
                                </Card>
                                
                                <Box 
                                  sx={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                                    gap: 3 
                                  }}
                                >
                                  {/* V2 Data */}
                                  {client.V2 && (
                                    <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'primary.main' }}>
                                      <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                          V2 Data
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                          <strong>Tab Number:</strong> {client.V2.label}<br/>
                                          <strong>Name:</strong> {client.V2.first_name} {client.V2.last_name}<br/>
                                          <strong>Email:</strong> {client.V2.email || '-'}<br/>
                                          <strong>Government Email:</strong> {client.V2.gov_email || '-'}<br/>
                                          <strong>Cell:</strong> {client.V2.cell || '-'}<br/>
                                          <strong>TDY Location:</strong> {client.V2.tdy_location || '-'}<br/>
                                          <strong>Agency/Department:</strong> {client.V2.agency_department || '-'}<br/>
                                          <strong>Contract Start:</strong> {formatDate(client.V2.contract_start) || '-'}<br/>
                                          <strong>Contract End:</strong> {formatDate(client.V2.contract_end) || '-'}<br/>
                                          <strong>TDY Type:</strong> {client.V2.tdy_type || '-'}<br/>
                                          <strong>Deal Type:</strong> {client.V2.deal_type || '-'}<br/>
                                          <strong>Contract Status:</strong> {client.V2.contract_status || '-'}<br/>
                                          <strong>Billing Address:</strong> {client.V2.billing_address || '-'}<br/>
                                          <strong>Billing City:</strong> {client.V2.billing_city || '-'}, {client.V2.billing_state || '-'} {client.V2.billing_zip || '-'}<br/>
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* V3 Data */}
                                  {client.V3 && (
                                    <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'success.main' }}>
                                      <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                          V3 Data
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                          <strong>Tab Number:</strong> {client.V3.label}<br/>
                                          <strong>Name:</strong> {client.V3.first_name} {client.V3.last_name}<br/>
                                          <strong>Email:</strong> {client.V3.email || '-'}<br/>
                                          <strong>Government Email:</strong> {client.V3.gov_email || '-'}<br/>
                                          <strong>Sales Rep:</strong> {client.V3.sales_rep || '-'}<br/>
                                          <strong>Cell:</strong> {client.V3.cell || '-'}<br/>
                                          <strong>TDY Location:</strong> {client.V3.tdy_location || '-'}<br/>
                                          <strong>Agency/Department:</strong> {client.V3.agency_department || '-'}<br/>
                                          <strong>Contract Start:</strong> {formatDate(client.V3.contract_start) || '-'}<br/>
                                          <strong>Contract End:</strong> {formatDate(client.V3.contract_end) || '-'}<br/>
                                          <strong>TDY Type:</strong> {client.V3.tdy_type || '-'}<br/>
                                          <strong>Deal Type:</strong> {client.V3.deal_type || '-'}<br/>
                                          <strong>Number of Nights:</strong> {client.V3.num_nights || '-'}<br/>
                                          <strong>Total Lodging Allocation:</strong> ${client.V3.total_lodging_allocation || '0'}<br/>
                                          <strong>Property Name:</strong> {client.V3.property_name || '-'}<br/>
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* V4 Data */}
                                  {client.V4 && (
                                    <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'warning.main' }}>
                                      <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                                          V4 Data
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                          <strong>Tab Number:</strong> {client.V4.label}<br/>
                                          <strong>Name:</strong> {client.V4.first_name} {client.V4.last_name}<br/>
                                          <strong>Email:</strong> {client.V4.email || '-'}<br/>
                                          <strong>Government Email:</strong> {client.V4.gov_email || '-'}<br/>
                                          <strong>Sales Rep:</strong> {client.V4.sales_rep || '-'}<br/>
                                          <strong>Cell:</strong> {client.V4.cell || '-'}<br/>
                                          <strong>TDY Location:</strong> {client.V4.tdy_location || '-'}<br/>
                                          <strong>Agency/Department:</strong> {client.V4.agency_department || '-'}<br/>
                                          <strong>Contract Start:</strong> {formatDate(client.V4.contract_start) || '-'}<br/>
                                          <strong>Contract End:</strong> {formatDate(client.V4.contract_end) || '-'}<br/>
                                          <strong>TDY Type:</strong> {client.V4.tdy_type || '-'}<br/>
                                          <strong>Deal Type:</strong> {client.V4.deal_type || '-'}<br/>
                                          <strong>Number of Nights:</strong> {client.V4.num_nights || '-'}<br/>
                                          <strong>Total Lodging Allocation:</strong> ${client.V4.total_lodging_allocation || '0'}<br/>
                                          <strong>Property Name:</strong> {client.V4.property_name || '-'}<br/>
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Master Accounting Data */}
                                  {client.master_accounting && (
                                    <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'error.main' }}>
                                      <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                          Master Accounting Data
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6, mb: 3 }}>
                                          <strong>Client Number (Column B):</strong> {client.master_accounting.label}<br/>
                                          <strong>Name:</strong> {client.first_name} {client.last_name}<br/>
                                          <strong>Contract Tax Rate:</strong> {client.master_accounting.contractTaxRate || 0}%<br/>
                                          <strong>Liquidation Tax Rate:</strong> {client.master_accounting.liquidationTaxRate || 0}%<br/>
                                          <strong>Sales Notes:</strong> {client.master_accounting.salesNotes || 'None'}<br/>
                                        </Typography>
                                        
                                        {/* Billing Details Section */}
                                        {client.master_accounting.billing_details && Object.keys(client.master_accounting.billing_details).length > 0 && (
                                          <>
                                            <Typography variant="h6" gutterBottom sx={{ color: 'error.main', fontWeight: 'bold', mt: 2 }}>
                                              Monthly Billing Details
                                            </Typography>
                                            <TableContainer component={Paper} sx={{ maxHeight: 300, mb: 2 }}>
                                              <Table stickyHeader size="small">
                                                <TableHead>
                                                  <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Month</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Status</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Due Date</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Bill</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Tax</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Total</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Paid</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Signed</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'error.50' }}>Invoiced</TableCell>
                                                  </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                  {Object.entries(client.master_accounting.billing_details).map(([month, details]) => (
                                                    <TableRow key={month} hover>
                                                      <TableCell sx={{ fontWeight: 'bold' }}>{month}</TableCell>
                                                      <TableCell>
                                                        {details.payment_status && (
                                                          <Chip 
                                                            label={details.payment_status} 
                                                            size="small" 
                                                            color={
                                                              details.payment_status.toLowerCase().includes('paid') ? 'success' :
                                                              details.payment_status.toLowerCase().includes('pending') ? 'warning' :
                                                              details.payment_status.toLowerCase().includes('overdue') ? 'error' :
                                                              'default'
                                                            }
                                                          />
                                                        )}
                                                      </TableCell>
                                                      <TableCell>{details.due_date || '-'}</TableCell>
                                                      <TableCell>
                                                        {details.bill !== undefined ? `$${details.bill.toFixed(2)}` : '-'}
                                                      </TableCell>
                                                      <TableCell>
                                                        {details.tax !== undefined ? `$${details.tax.toFixed(2)}` : '-'}
                                                      </TableCell>
                                                      <TableCell sx={{ fontWeight: 'bold' }}>
                                                        {details.total_bill !== undefined ? `$${details.total_bill.toFixed(2)}` : '-'}
                                                      </TableCell>
                                                      <TableCell>
                                                        {details.paid !== undefined ? `$${details.paid.toFixed(2)}` : '-'}
                                                      </TableCell>
                                                      <TableCell>
                                                        {details.signed && (
                                                          <Chip 
                                                            label={details.signed} 
                                                            size="small" 
                                                            variant="outlined"
                                                            color={details.signed.toLowerCase() === 'yes' ? 'success' : 'default'}
                                                          />
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        {details.invoiced && (
                                                          <Chip 
                                                            label={details.invoiced} 
                                                            size="small" 
                                                            variant="outlined"
                                                            color={details.invoiced.toLowerCase() === 'yes' ? 'success' : 'default'}
                                                          />
                                                        )}
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </TableContainer>
                                            
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                              {Object.keys(client.master_accounting.billing_details).length} months of billing data found
                                            </Typography>
                                          </>
                                        )}
                                      </CardContent>
                                    </Card>
                                  )}
                                </Box>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Action Buttons */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={createClientsInDatabase}
                disabled={creatingInDatabase || clients.length === 0}
                startIcon={creatingInDatabase ? <LinearProgress sx={{ width: 20, height: 20 }} /> : <CloudUploadIcon />}
                sx={{
                  minWidth: 250,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  borderRadius: 2
                }}
              >
                {creatingInDatabase ? 'Creating Clients...' : `Create ${clients.length} Clients in Database`}
              </Button>
              
              <Button
                variant="contained"
                size="large"
                color="success"
                onClick={exportToCSV}
                disabled={clients.length === 0}
                startIcon={<DownloadIcon />}
                sx={{
                  minWidth: 250,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  borderRadius: 2
                }}
              >
                Export {clients.length} Clients to CSV
              </Button>
            </Box>
            
            {clients.length > 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Save all {clients.length} clients to Firestore database or export to CSV file
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default ParsingManager; 