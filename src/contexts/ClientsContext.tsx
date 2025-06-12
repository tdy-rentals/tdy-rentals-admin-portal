import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Client {
  clientId: string;
  name: string;
  address?: string;
  contactEmail?: string;
  verifiedFields: string[];
}

interface ClientsContextType {
  clients: Client[];
  loading: boolean;
  error: string | null;
  upsertClient: (clientData: Partial<Client> & { clientId: string; name: string }) => Promise<void>;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = querySnapshot.docs.map(doc => ({
          clientId: doc.id,
          ...doc.data()
        })) as Client[];
        setClients(clientsData);
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };

    fetchClients();
  }, []);

  const upsertClient = async (clientData: Partial<Client> & { clientId: string; name: string }) => {
    const clientsQuery = query(
      collection(db, 'clients'),
      where('clientId', '==', clientData.clientId)
    );

    const querySnapshot = await getDocs(clientsQuery);

    if (querySnapshot.empty) {
      // Client does not exist → create
      await addDoc(collection(db, 'clients'), {
        ...clientData,
        verifiedFields: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Client exists → merge update
      const clientDoc = querySnapshot.docs[0];
      const existingClient = clientDoc.data() as Client;

      // Determine which fields can be updated
      const updatedFields: any = {};
      Object.keys(clientData).forEach((field) => {
        if (
          field !== 'clientId' &&
          field !== 'verifiedFields' &&
          !existingClient.verifiedFields.includes(field)
        ) {
          updatedFields[field] = (clientData as any)[field];
        }
      });

      // Always update updatedAt
      updatedFields.updatedAt = serverTimestamp();

      // Perform the update
      const clientRef = doc(db, 'clients', clientDoc.id);
      await updateDoc(clientRef, updatedFields);
    }
  };

  const value = {
    clients,
    loading: false,
    error: null,
    upsertClient
  };

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};
