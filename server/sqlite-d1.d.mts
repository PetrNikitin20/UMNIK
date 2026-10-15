export function openDatabase(filename:string):{
 prepare(sql:string):{bind(...values:unknown[]):any;all():Promise<any>;run():Promise<any>;first<T=Record<string,unknown>>(column?:string):Promise<T|null>;raw(options?:{columnNames?:boolean}):Promise<unknown[][]>};
 batch(statements:any[]):Promise<any[]>;exec(sql:string):Promise<{count:number;duration:number}>;close():void;sqlite:any;
};

