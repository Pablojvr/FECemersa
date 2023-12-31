import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTable } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { FacturasService } from 'src/app/services/facturas.service';
import Swal from 'sweetalert2';
import { getServerErrorMessage } from '../index-compras/index-compras-datasource';

@Component({
  selector: 'app-nota-credito',
  templateUrl: './nota-credito.component.html',
  styleUrls: ['./nota-credito.component.css'],
})
export class NotaCreditoComponent implements OnInit {
  solicitud!: any;
  readOnly: boolean = false;
  ordenes: Array<any> = [];
  displayedColumns: any = [
    'codigo',
    'descripcion',
    'lote',
    'unidades',
    'comprado',
    'punit',
    'descuento',
    'total',
  ];
  saving: boolean = false;
  saved: boolean = false;
  totalFactura: any=0;
  factura: any;
  @ViewChild(MatTable) table!: MatTable<any>;
  subtotalFactura: any = 0;
  iva: any = 0;
  constructor(
    private _router: Router,
    private _fb: FormBuilder,
    private facturasService: FacturasService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    var idOrden = this.route.snapshot.paramMap.get('idNota');
    if (idOrden) {
      this.readOnly = true;
      // this.facturasService.getOrdenesCompraByID(idOrden).subscribe((data) => {
      //   if (data == undefined) {
      //   } else {
      //     let tempOrdenes = data.data.value.map((item: any) => {
      //       let newItem = this.capitalizeName(item);
      //       newItem.documentLines = newItem.documentLines.map((item2: any) => {
      //         return this.capitalizeName(item2);
      //       });
      //       return newItem;
      //     });
      //     console.log(tempOrdenes);
      //     this.ordenes = tempOrdenes;
      //   }
      //   console.log(data);
      //   console.log(this.solicitud);
      // });
    }
    var idFactura = this.route.snapshot.paramMap.get('idFactura');
    if (idFactura) {
      this.facturasService.getFacturaByID(idFactura).subscribe({
        next: (data: any) => {
          debugger;
          var capitalizedData = Object.assign({
            CardCode: data.cardCode,
            CardName: data.cardName,
            docDate: data.fecha,
            additionalID: data.nrc,
            series: this.getSeries(data.serie),
            u_EJJE_RazonSocial: data.cardName,
            u_EJJE_NombreSocioNegocio: data.cardName,
            u_EJJE_Giro: data.giro,
            u_EJJE_TipoDocumento: 'NCF',
            u_EJJE_NitSocioNegocio: data.nit,
            u_EJJE_NrcSocioNegocio:data.nrc,
            u_EJJE_NumeroDocumento: data.numeroDocumento,
            U_EJJE_CorDes: 'FACT-' + data.idFactura,
            DocDate: moment().format(),
            DocumentLines: [],
          });
          capitalizedData.documentLines = data.documentLines.filter((o:any)=>{return (o.quantity - o.quantityDevuelta) > 0} ).map((o: any) => {
            return {
              ItemCode: o['itemCode'],
              ItemName: o['itemDescription'],
              QuantityFacturada: o['quantity'],
              QuantityDevuelta: o['quantityDevuelta'],
              SinDevolver: o['quantity'] - o['quantityDevuelta'],
              UnitPrice: o['price'],
              BaseType: '13',
              BaseEntry: data.docEntry,
              BaseLine: `${o['line']}`,
              TaxCode: o['taxCode'],
              BatchNum: o['batchNum'],
              DiscountPercent: o['discountPercent'],
            };
          });
          this.factura = capitalizedData;
          this.solicitud = data;

          Swal.fire({
            title: 'Cargando',
            text: '',
            icon: 'info',
            timer: 2000,
            heightAuto: false,
            showCancelButton: false,
            showConfirmButton: false,
          }).then(
            () => {
              // this._router.navigate(['/compras']);
            },
            (dismiss: any) => {
              // this._router.navigate(['/compras']);
            }
          );
        },
        error: (error) => {
          let errorMsg: string;
          if (error.error instanceof ErrorEvent) {
            errorMsg = `Error: ${error.error.message}`;
          } else {
            errorMsg = getServerErrorMessage(error);
          }

          Swal.fire({
            title: '',
            text: errorMsg,
            icon: 'error',
            heightAuto: false,
          });
        },
      });
    }
  }

  capitalizeName(a: any) {
    for (var key in a) {
      if (a.hasOwnProperty(key)) {
        a[key.charAt(0).toUpperCase() + key.substring(1)] = a[key];
        delete a[key];
      }
    }
    return a;
  }

  groupBy(xs: any, key: any) {
    return xs.reduce(function (rv: any, x: any) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }

  groupByProveedor(xs: any) {
    var hash = Object.create(null);
    var grouped: any = [];
    var DocEntry = this.solicitud.docEntry;
    xs.forEach((o: any) => {
      var key = ['cardCode', 'cardName']
        .map((k) => {
          return o[k];
        })
        .join('|');
      console.log(key);
      if (!hash[key]) {
        hash[key] = {
          CardCode: o.cardCode,
          CardName: o.cardName,
          U_EJJE_CorDes: 'CreditNote-SOL-' + this.solicitud.idSolicitudCompra,
          DocDate: moment().format(),
          DocumentLines: [],
          U_EJJE_TipoDocumento: 'NCF',
        };
        grouped.push(hash[key]);
      }
      ['used'].forEach((k) => {
        hash[key]['DocumentLines'].push({
          ItemCode: o['itemCode'],
          ItemName: o['itemName'],
          Quantity: o['amount'],
          UnitPrice: o['price'],
          BaseType: '1470000113',
          BaseEntry: DocEntry,
          BaseLine: `${o['line']}`,
          TaxCode: o['taxCode'],
        });
      });
    });

    return grouped;
  }

  removeItem(item: any) {
    let index = this.factura.documentLines.indexOf(item);
    this.factura.documentLines.splice(index, 1);
    this.table.renderRows();
  }

  generarNotaCredito() {
    if(this.saving) return;
    this.saving = true;
    Swal.fire({
      title: '',
      text: 'Guardando...',
      icon: 'info',
      heightAuto: false,
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,

    });

    this.facturasService
      .saveNotaCredito({
        notaCredito: this.factura,
        idFactura: this.solicitud.idFactura,
      })
      .subscribe({
        next: (_) => {
          this.saving = false;
          this.saved = true;
          Swal.fire({
            title: 'Guardado',
            text: 'Se ha guardado correctamente...',
            icon: 'success',
            timer: 2000,
            heightAuto: false,
            showCancelButton: false,
            showConfirmButton: false,
          }).then(
            () => {
              this._router.navigate(['/facturas']);
            },
            (dismiss: any) => {
              this._router.navigate(['/facturas']);
            }
          );
        },
        error: (error) => {
          let errorMsg: string;
          if (error.error instanceof ErrorEvent) {
            errorMsg = `Error: ${error.error.message}`;
          } else {
            errorMsg = getServerErrorMessage(error);
          }

          Swal.fire({
            title: '',
            text: errorMsg,
            icon: 'error',
            heightAuto: false,
          });
          this.saving = false;
          this.saved = false;
        },
      });
    console.log(this.ordenes);
  }

  updateItemCalculatedValues(item: any) {
    console.log(item.Quantity);
    debugger;
    if (item.Quantity != '' && item.Quantity != null) {
      console.log(
        'Entro',
        eval(item.Quantity) <= 0,
        eval(item.Quantity) > eval(item.SinDevolver)
      );
      if (eval(item.Quantity) <= 0) {
        item.Quantity = 1;
      } else if (eval(item.Quantity) > eval(item.SinDevolver)) {
        item.Quantity = item.SinDevolver;
      }

    }

    this.updateTotal();
  }

  updateTotal() {
    this.subtotalFactura = this.factura.documentLines.reduce(
      (a: any, b: any) => {
        console.log( a + b.UnitPrice * b.Quantity*(1-(parseInt(b.DiscountPercent)/100)))
        return a + b.UnitPrice * b.Quantity*(1-(parseInt(b.DiscountPercent)/100));
      },
      0.0
    ).toFixed(4);
    this.iva = (this.subtotalFactura * 0.13).toFixed(4);
    this.totalFactura = Number(this.subtotalFactura) + Number(this.iva);
    // this.updateRetencion(Number(this.subtotalFactura)<100);
  }

  getSeries(serie: any) {
    let series: any = {
      CCF: 42,
      COF: 43,
      TIC: 154,
      EXP: 44,
    };
    return series[serie] ?? 42;
  }
  getTipoDocumento(serie: any) {
    let series: any = {
      CCF: 'CRF',
      COF: 'COF',
      TIC: 'TIC',
      EXP: 'FAE',
    };
    return series[serie] ?? 'CRF';
  }
  getTaxCode(TipoDocumento: any) {
    let series: any = {
      CCF: 'IVACRF',
      COF: 'IVACOF',
      TIC: 'IVACOF',
      EXP: 'IVAEXP',
    };
    return series[TipoDocumento] ?? '';
  }
}
