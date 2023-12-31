import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Page } from '../pages/usuarios/usuarios-datasource';

@Injectable({
  providedIn: 'root',
})
export class ComprasService {
  public baseUrl = environment.apiURL;
  constructor(private http: HttpClient) {}

  getProveedores(filter = '') {
    return this.http.get<any>(`${this.baseUrl}/Compras/getItemGroups`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('filter', filter),
    });
  }

  getSuppliers(filter = '') {
    return this.http.get<any>(`${this.baseUrl}/Compras/getSuppliers`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('filter', filter),
    });
  }


  getPurchaseOrderList(filter = '',cardCode:string) {
    return this.http.get<any>(`${this.baseUrl}/Compras/GetPurchaseOrdersBySupplier`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('filter', filter)
        .set('cardCode', cardCode),
    });
  }

  printSolicitudCompra(numMonths = 2,numMonthsCob=2,idSolicitud = 1) {
    return this.http.get<any>(`${this.baseUrl}/SolicitudCompras/printSolicitudCompra`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('numMonths', numMonths.toString())
        .set('numMonthsCob', numMonthsCob.toString())
        .set('idSolicitud', idSolicitud.toString())
    });
  }

  printOrdenCompra(idSolicitud = 1) {
    return this.http.get<any>(`${this.baseUrl}/SolicitudCompras/printOrdenCompra`, {
      params: new HttpParams()
        .set('idSolicitud', idSolicitud.toString())
    });
  }

  printEntradaMercancia(idSolicitud = 1) {
    return this.http.get<any>(`${this.baseUrl}/SolicitudCompras/printEntradaMercancia`, {
      params: new HttpParams()
        .set('idSolicitud', idSolicitud.toString())
    });
  }

  getVendorsByItemCode(itemCode = '') {
    return this.http.get<any>(`${this.baseUrl}/Compras/getVendorsByItemCode`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('itemCode', itemCode),
    });
  }

  getSuggestedPurchaseOrderReport(
    numMonths: number = 2,
    numMonthsCob: number = 2,
    supplier = '10'
  ) {
    return this.http.get<Object>(
      `${this.baseUrl}/Compras/getSuggestedPurchaseOrderReport`,
      {
        params: new HttpParams()
          // .set('courseId', UserId.toString())
          .set('numMonths', numMonths.toString())
          .set('numMonthsCob', numMonthsCob.toString())
          .set('supplier', supplier.toString()),
      }
    );
  }

  getPaginatedSolicitudDeCompra(
    fechaIni = '',
    fechaFin = '',
    laboratorio = '',
    numSolicitud = '',
    estado = 1,
    pageNumber = 0,
    pageSize = 10,
    orderBy = '',
    direction = ''
  ) {
    return this.http.get<Page[]>(`${this.baseUrl}/SolicitudCompras`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('fechaIni', fechaIni)
        .set('fechaFin', fechaFin)
        .set('laboratorio', laboratorio)
        .set('numSolicitud', numSolicitud)
        .set('estado', estado.toString())
        .set('pageNumber', pageNumber.toString())
        .set('pageSize', pageSize.toString())
        .set('orderBy',orderBy)
        .set('direction',direction),
    });
  }

  getPaginatedEntradaMercancia(
    fechaIni = '',
    fechaFin = '',
    pageNumber = 0,
    pageSize = 10,
    orderBy='',
    direction=''
  ) {
    return this.http.get<Page[]>(`${this.baseUrl}/EntradaMercancia`, {
      params: new HttpParams()
        // .set('courseId', UserId.toString())
        .set('fechaIni', fechaIni)
        .set('fechaFin', fechaFin)
        .set('pageNumber', pageNumber.toString())
        .set('pageSize', pageSize.toString())
        .set('orderBy', orderBy.toString())
        .set('direction', direction.toString())
        ,
    });
  }

  getEntradaMercanciaByID(id: any) {
    return this.http.get<any>(`${this.baseUrl}/EntradaMercancia/${id}`, {});
  }

  getSolicitudCompraByID(id: any) {
    return this.http.get<any>(`${this.baseUrl}/SolicitudCompras/${id}`, {});
  }


  abrirSolicitud(id:any){
    return this.http.get<any>(`${this.baseUrl}/Compras/abrirSolicitud/?id=${id}`, {});
  }

  getOrdenesCompraByID(id: any) {
    return this.http.get<any>(
      `${this.baseUrl}/Compras/GetPurchaseOrdersBySolicitudId/?id=${id}`,
      {}
    );
  }

  getPurchaseOrdersByDocNum(docNum: any) {
    return this.http.get<any>(
      `${this.baseUrl}/Compras/GetPurchaseOrdersByDocNum/?docNum=${docNum}`,
      {}
    );
  }

  getItemsRentabilidad(itemCodes: string) {
    return this.http.post<any>(
      `${this.baseUrl}/Compras/GetItemsRentabilidad`,
      {itemCode:itemCodes}
    );
  }

  saveSolicitudDeCompra(sol: any) {
    let solId = sol.idSolicitudCompra;
    if (!solId) {
      return this.http.post(`${this.baseUrl}/SolicitudCompras`, sol);
    } else {
      return this.http.put(`${this.baseUrl}/SolicitudCompras/${solId}`, sol);
    }
  }



  saveEntradaMercancia(sol: any) {
    let solId = sol.idSolicitudCompra;
    if (!solId) {
      return this.http.post(`${this.baseUrl}/EntradaMercancia`, sol);
    } else {
      return this.http.put(`${this.baseUrl}/EntradaMercancia/${solId}`, sol);
    }
  }

  deleteSolicitudDeCompra(sol: any) {
    let solId = sol.idSolicitudCompra;
    return this.http.delete(`${this.baseUrl}/SolicitudCompras/${solId}`, sol);
  }

  saveOrdenesDeCompra(sol: any) {
    return this.http.post(`${this.baseUrl}/Compras/newPurchaseOrder`, sol);
  }

  getEstados() {
    return this.http.get<any>(
      `${this.baseUrl}/SolicitudCompras/Estados/ALL`,
      {}
    );
  }
}
