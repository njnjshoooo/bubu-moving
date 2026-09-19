'use client';
import {createContext,useContext,type ImgHTMLAttributes} from 'react';
export type PhotoMap=Record<string,{url:string;alt:string}>;
const Context=createContext<PhotoMap>({});
export function PhotoProvider({photos,children}:{photos:PhotoMap;children:React.ReactNode}){return <Context.Provider value={photos}>{children}</Context.Provider>}
export function ManagedImage({src,alt,...props}:ImgHTMLAttributes<HTMLImageElement>){const photos=useContext(Context);const replacement=typeof src==='string'?photos[src]:null;return <img {...props} src={replacement?.url||src} alt={replacement?.alt||alt}/>}

export function PhotoCaption({source,children,className}:{source:string;children:React.ReactNode;className?:string}){const photos=useContext(Context);return <small className={className}>{photos[source]?.alt||children}</small>}
