'use client';
import {createContext,useContext} from 'react';
import {seedProducts,type Product} from '@/lib/catalog';
const Context=createContext<Product[]>(seedProducts);
export function CatalogProvider({products,children}:{products:Product[];children:React.ReactNode}){return <Context.Provider value={products}>{children}</Context.Provider>}
export function useProducts(){return useContext(Context)}
