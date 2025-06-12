import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface Client {
  clientId: string;
  name: string;
  address?: string;
  contactEmail?: string;
  verifiedFields: string[];
  createdAt: any;
  updatedAt: any;
}

interface ClientsContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'createdAt' | 'updatedAt' | 'verifiedFields'>) => Promise<void>;
  upsertClient: (clientData: Partial<Client> & { clientId: string; name: string }) => Promise<void>;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        clientId: docSnap.id,
        ...docSnap.data()
      })) as Client[];
      setClients(data);
    });
    return unsubscribe;
  }, []);

  const addClient = async (client: Omit<Client, 'createdAt' | 'updatedAt' | 'verifiedFields'>) => {
    await addDoc(collection(db, 'clients'), {
      ...client,
      verifiedFields: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

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
    addClient,
    upsertClient
  };

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};
