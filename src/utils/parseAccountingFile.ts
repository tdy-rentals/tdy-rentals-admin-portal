import type { ParsedTransaction } from './transactionHelpers';
import V2Parser from './parsers/V2Parser';
import V3Parser from './parsers/V3Parser';
import V4Parser from './parsers/V4Parser';
import MasterAccountingParser from './parsers/MasterAccountingParser';

// Example ClientData type — match to your parser output
interface ParsedClientData {
  clientId: string;
  name: string;
  address?: string;
  contactEmail?: string;
}

type FileType = 'V2' | 'V3' | 'V4' | 'MasterAccounting';

interface ParseResult {
  clientData: {
    clientId: string;
    name: string;
    address?: string;
    contactEmail?: string;
  };
  transactions: ParsedTransaction[];
}

export const parseAccountingFile = async (file: File): Promise<ParseResult> => {
  // Determine file type from the file name
  const fileName = file.name.toLowerCase();
  let fileType: FileType;

  if (fileName.includes('v2')) {
    fileType = 'V2';
  } else if (fileName.includes('v3')) {
    fileType = 'V3';
  } else if (fileName.includes('v4')) {
    fileType = 'V4';
  } else if (fileName.includes('master') || fileName.includes('accounting')) {
    fileType = 'MasterAccounting';
  } else {
    throw new Error('Could not determine file type from filename. Please ensure the filename contains V2, V3, V4, or Master/Accounting.');
  }

  // Read the file
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Parse based on file type
  let result: ParseResult;
  switch (fileType) {
    case 'V2':
      result = await V2Parser.parse(data);
      break;
    case 'V3':
      result = await V3Parser.parse(data);
      break;
    case 'V4':
      result = await V4Parser.parse(data);
      break;
    case 'MasterAccounting':
      result = await MasterAccountingParser.parse(data);
      break;
    default:
      throw new Error('Unsupported file type');
  }

  return result;
};
