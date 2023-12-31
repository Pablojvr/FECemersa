import { DatePipe } from '@angular/common';
import {
  Component, ElementRef, OnInit,
  ViewChild
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { debounceTime, finalize, switchMap, tap } from 'rxjs/operators';
import { ComprasService } from 'src/app/services/compras.service';
import Swal from 'sweetalert2';
import { ComprasDataSource } from '../compras/compras-datasource';
import { getServerErrorMessage } from '../index-compras/index-compras-datasource';

@Component({
  selector: 'app-entrada-mercancia',
  templateUrl: './entrada-mercancia.component.html',
  styleUrls: ['./entrada-mercancia.component.css'],
})
export class EntradaMercanciaComponent implements OnInit {
  // comprasForm!: FormGroup;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<any>;
  @ViewChild('heroForm')  form! : NgForm;
  @ViewChild('tableContainer') tableContainer!: ElementRef;
  numOrdenCompra = new BehaviorSubject<string>('');
  proveedor = new BehaviorSubject<string>('');
  dataSource: ComprasDataSource;
  fecha: string = '';
  readMode = true;
  initialColumns = [
    'codigo',
    'descripcion',
    'lote',
    'vencimiento',
    'UnidadesGravadas',
    'price',
    'vgrav',
    'unidadesBonificadas',
    'descuento',
    'valorBonificado',
    'valorDescuento',
    'totalGravado',
    'tunidades',
    'costoreal',
    'rentabilidad',
    'precioVenta',
    'preciopublico',
  ];
  middleColumns = ['M1', 'M2'];
  onlyNewColums = [];
  endColumns = [];
  itemsUniqueCor= 0;
  filteredLabs: any;
  isLoading = false;
  errorMsg!: string;
  solicitud: any = { documentLines: [] };
  saving: any = false;
  saved: any = false;
  expandedElement: any | null;
  isLoadingPO: boolean = false;
  filteredPO!: any[];
  subtotalFactura: any;
  iva: any = 0;
  totalFactura: any = 0;

  constructor(
    private _router: Router,
    private _fb: FormBuilder,
    private comprasService: ComprasService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private datePipe: DatePipe
  ) {
    // this.comprasForm = this._fb.group({
    //   numFactura: [2, [Validators.required]],
    //   proveedor: [null, Validators.required],
    //   numOrdenCompra: [null, Validators.required],
    //   laboratory: [null, Validators.required],
    //   fecha: [new Date(), Validators.required],
    // });
    this.dataSource = new ComprasDataSource(this.comprasService);
    // this.dataSource.getReporte(this.numFactura, this.numOrdenCompra, this.laboratory);
    // this.updateDisplayedColumns();

    this.suscribeInputs();
  }
  suscribeInputs() {
    this.proveedor
      .asObservable()
      .pipe(
        debounceTime(500),
        tap(() => {
          this.errorMsg = '';
          this.filteredLabs = [];
          this.isLoading = true;
        }),
        switchMap((value) =>
          this.comprasService
            .getSuppliers(this.proveedor.getValue() ?? '')
            .pipe(
              finalize(() => {
                this.isLoading = false;
              })
            )
        )
      )
      .subscribe((data) => {
        if (data.data?.value == undefined) {
          this.errorMsg = data['Error'];
          this.filteredLabs = [];
        } else {
          this.errorMsg = '';
          this.filteredLabs = data.data.value;
        }
        console.log(data);
        console.log(this.filteredLabs);
      });

    this.numOrdenCompra
      .asObservable()
      .pipe(
        debounceTime(500),
        tap(() => {
          this.errorMsg = '';
          this.filteredLabs = [];
          this.isLoadingPO = true;
        }),
        switchMap((value) =>
          this.comprasService
            .getPurchaseOrderList(
              value ?? '',
              this.solicitud.proveedor?.cardCode
            )
            .pipe(
              finalize(() => {
                this.isLoadingPO = false;
              })
            )
        )
      )
      .subscribe((data) => {
        if (data.data?.value == undefined) {
          this.errorMsg = data['Error'];
          this.filteredPO = [];
        } else {
          this.errorMsg = '';
          this.filteredPO = data.data.value;
        }
        console.log(data);
        console.log(this.filteredPO);
      });
  }

  changeOrdenCompra(value: any) {
    this.numOrdenCompra.next(value);
  }
  changeProveedor(value: any) {
    this.proveedor.next(value);
  }
  displayFn(data: any): string {
    console.log(data);
    return data ? data.cardName : '';
  }

  displayPurchaseOrder(data: any): string {
    console.log(data);
    // if (data.docNum && !this.solicitud) {
    //   this.getPurchaseOrderById(data.docNum);
    // }
    return data ? data.docNum : '';
  }

  openChanged(event: any, item: any) {
    this.isLoading = true;
    console.log('Se abrio', event);
    if (event) {
      this.editProveedor(item);
    }
  }
  selectionChange(event: any, item: any) {
    this.isLoading = true;
    console.log('Se selecciono', event);
    let supplier = item.suppliers.find(
      (element: any) => element.CardCode == event.value
    );
    console.log('proveedor', supplier);
    item.CARDCODE = supplier.CardCode;
    item.VATCODE = supplier.VatGroupLatinAmerica;
    item.PROVEEDOR = supplier.CardName;
  }

  ngOnInit(): void {
    var id = this.route.snapshot.paramMap.get('id');
    var idEntradaMercancia =
      this.route.snapshot.paramMap.get('idEntradaMercancia');
    if (id) {
      this.readMode = false;
      this.getPurchaseOrderById(id);
    } else if (idEntradaMercancia) {
      this.readMode = true;
      this.getEntradaMercancia(idEntradaMercancia);
    } else {
      this.readMode = false;
    }
  }

  getPurchaseOrderById(id: any) {
    if(this.readMode) return;
    Swal.fire({
      title: '',
      text: 'Cargando...',
      icon: 'info',
      heightAuto: false,
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    this.comprasService.getPurchaseOrdersByDocNum(id).subscribe((data) => {
      if (data.data == undefined) {
        this.errorMsg = data['Error'];
        this.solicitud = null;
        Swal.fire({
          title: '',
          text: 'Ha ocurrido un problema!',
          icon: 'success',
          timer: 1000,
          heightAuto: false,
          showCancelButton: false,
          showConfirmButton: false,
        });
      } else {
        this.errorMsg = '';
        var processedData = data.data.value[0];
        debugger;
        var orderedLines = processedData.documentLines.sort((a:any,b:any) => {

          return a.itemDescription.localeCompare(b.itemDescription)
        });
        processedData.documentLines = processedData.documentLines.filter((x:any)=>Number(x.remainingOpenInventoryQuantity) > 0);
        var ids = processedData.documentLines
          .map((x: any) => `'${x.itemCode}'`)
          .join();

        this.comprasService.getItemsRentabilidad(ids).subscribe((data2) => {
          if (data.data != undefined) {
            processedData.documentLines.forEach( (obj: any) =>{
              obj.unidadesGravadas = Number(obj.remainingOpenInventoryQuantity);
              obj.unidadesBonificadas = Number(obj.u_EJJE_UBonificada);
              obj.randomID =  this.itemsUniqueCor++;
              obj.price = obj.unitPrice;
              let found = JSON.parse(data2.data).find(
                (element: any) => element.ItemCode == obj.itemCode
              );
              if (found) {
                obj.rentabilidad = found.U_EJJE_Rentabilidad;
              }
              this.updateItemCalculatedValues(obj,null);
            });
          } else {
            processedData.documentLines.forEach(function (obj: any) {
              obj.price = obj.unitPrice;
              obj.rentabilidad = null;
            });
          }

          this.solicitud = processedData;
          // this.updateDisplayedColumns();
          this.solicitud.numOrdenCompra = {
            docNum: this.solicitud.docNum,
            docDate: this.solicitud.docDate,
          };
          this.solicitud.proveedor = {
            cardName: this.solicitud.cardName,
            cardCode: this.solicitud.cardCode,
          };
          this.solicitud.fecha = this.datePipe.transform(new Date(),"yyyy-MM-dd");

          Swal.fire({
            title: '',
            text: 'Listo',
            icon: 'success',
            timer: 1000,
            heightAuto: false,
            showCancelButton: false,
            showConfirmButton: false,
          });
        });
      }
      this.isLoading = false;
      console.log(data);
      console.log(this.solicitud);
    });
  }

  getEntradaMercancia(id: any) {
    Swal.fire({
      title: '',
      text: 'Cargando...',
      icon: 'info',
      heightAuto: false,
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    this.comprasService.getEntradaMercanciaByID(id).subscribe((data) => {
      if (data == undefined) {
        this.errorMsg = data['Error'];
        this.solicitud = null;
        Swal.fire({
          title: '',
          text: 'Ha ocurrido un problema!',
          icon: 'success',
          timer: 1000,
          heightAuto: false,
          showCancelButton: false,
          showConfirmButton: false,
        });
      } else {
        this.errorMsg = '';
        var processedData = data;

        this.solicitud = processedData;
        // this.updateDisplayedColumns();
        this.solicitud.numOrdenCompra = {
          docNum: this.solicitud.numeroOrden,
          docDate: null,
        };
        this.solicitud.proveedor = {
          cardName: this.solicitud.cardName,
          cardCode: this.solicitud.cardCode,
        };
        this.solicitud.numFactura = this.solicitud.numeroFactura;
        this.solicitud.documentLines = this.solicitud.documentLines.map(
          (element: any) => {
            return Object.assign(element, {
              randomID : this.itemsUniqueCor++
            });
          }
        );

        this.updateTotal();
        Swal.fire({
          title: '',
          text: 'Listo',
          icon: 'success',
          timer: 1000,
          heightAuto: false,
          showCancelButton: false,
          showConfirmButton: false,
        });
      }
      this.isLoading = false;
      console.log(data);
      console.log(this.solicitud);
    });
  }

  getProveedores() {
    this.isLoading = true;
    this.comprasService.getSuppliers('').subscribe((data) => {
      if (data.data?.value == undefined) {
        this.errorMsg = data['Error'];
        this.filteredLabs = [];
      } else {
        this.errorMsg = '';
        this.filteredLabs = data.data.value;
      }
      this.isLoading = false;
      console.log(data);
      console.log(this.filteredLabs);
    });
  }

  getPurchaseOrdersList() {
    this.isLoadingPO = true;
    this.comprasService
      .getPurchaseOrderList('', this.solicitud.proveedor?.cardCode)
      .subscribe((data) => {
        if (data.data?.value == undefined) {
          this.errorMsg = data['Error'];
          this.filteredPO = [];
        } else {
          this.errorMsg = '';
          this.filteredPO = data.data.value;
        }
        this.isLoadingPO = false;
        console.log(data);
        console.log(this.filteredLabs);
      });
  }

  editProveedor(item: any) {
    item.editing = false;
    item.loadingSuppliers = true;
    this.comprasService
      .getVendorsByItemCode(item.ITEMCODE)
      .subscribe((data) => {
        if (data == undefined) {
          this.errorMsg = data.Error;
          item.suppliers = [];
        } else {
          this.errorMsg = '';
          item.suppliers = data;
        }
        item.loadingSuppliers = false;
        item.editing = true;
        console.log('datos', data);
        console.log('en el item', item.suppliers);
      });
  }
  setSolicitudData() {
    var listadoActiculosDataSource = this.dataSource.usuarioSubject.getValue();
    console.log('Solicitud de Datos', listadoActiculosDataSource);
    this.solicitud.articulos.forEach((item: any) => {
      var found = listadoActiculosDataSource.find(
        (i: any) => item.itemCode == i.ITEMCODE
      );
      if (found) {
        var index = listadoActiculosDataSource.indexOf(found);
        listadoActiculosDataSource[index] = Object.assign(found, {
          COMPRAR: item.amount,
          price: parseInt(item.price),
          PROVEEDOR: item.cardName,
          CARDCODE: item.cardCode,
          VATCODE: item.vatCode,
        });
      }
    });
    this.dataSource.usuarioSubject.next(listadoActiculosDataSource);
  }
  // guardarSolicitud() {
  //   var articulosSolicitados = this.dataSource.usuarioSubject
  //     .getValue()
  //     .filter((item: any) => item.COMPRAR > 0)
  //     .map((item: any, index) => {
  //       return {
  //         ItemCode: item.ITEMCODE,
  //         LineVendor: item.CARDCODE,
  //         Quantity: item.COMPRAR,
  //         Price: item.price,
  //         LineNum: index,
  //       };
  //     });

  //   var solicitud = {
  //     RequriedDate: this.fecha,
  //     DocumentLines: articulosSolicitados,
  //   };

  //   console.log(solicitud);
  // }

  guardarSolicitud() {
    this.form.form.updateValueAndValidity();
    if(!this.form.form.valid){
      Swal.fire({
        title: 'Informacion incompleta',
        text: 'Debe llenar todos los campos',
        icon: 'info',
        heightAuto: false,
        showCancelButton: false,
        showConfirmButton: false,
      });
      return;
    }
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

    var sol = Object.assign({}, this.solicitud);

    sol.NumeroFactura = this.solicitud.numFactura;
    sol.cardCode = this.solicitud.proveedor.cardCode;
    sol.NumeroOrden = this.solicitud.numOrdenCompra.docNum;
    sol.BaseEntry = this.solicitud.docEntry;
    sol.BaseDocNum = this.solicitud.docNum;
    sol.Usuario =   JSON.parse(
      localStorage.getItem('loggedInUser') ?? '{}'
    )?.nombre;
    sol.DocNum = null;
    sol.DocEntry = null;
    sol.documentLines = sol.documentLines.map((line:any)=>{
      line.line = line.lineNum;
      return line;
    })
    this.comprasService.saveEntradaMercancia(sol).subscribe({
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
            this._router.navigate(['/ingreso_compras']);
          },
          (dismiss: any) => {
            this._router.navigate(['/ingreso_compras']);
          }
        );
      },
      error: (error) => {
        let errorMsg: string;
        if (error.error instanceof ErrorEvent) {
          errorMsg = `Error: ${error.error.message}`;
        } else {
          errorMsg = getServerErrorMessage(error);
          console.log(error);
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

    console.log(this.solicitud);
  }

  updateItemCalculatedValues(item: any, name: any) {
    if (item.descuento != '' && item.descuento != null) {
      item.descuento < 0 ? (item.descuento = 0) : item.descuento;
      item.descuento > 100 ? (item.descuento = 100) : item.descuento;
    }
    if (item.rentabilidad != '' && item.rentabilidad != null) {
      item.rentabilidad < 0 ? (item.rentabilidad = 0) : item.rentabilidad;
      item.rentabilidad > 100 ? (item.rentabilidad = 100) : item.rentabilidad;
    }
    console.log('HA CAMBIADO UN VALOR');

    item.totalUnidades =
      !isNaN(item.unidadesGravadas) && !isNaN(item.unidadesBonificadas)
        ? item.unidadesGravadas + item.unidadesBonificadas
        : 0;
    item.valorGravado =
      !isNaN(item.totalUnidades) && !isNaN(item.price)
        ? (item.totalUnidades * item.price).toFixed(4)
        : 0;
    item.valorBonificado =
      !isNaN(item.unidadesBonificadas) && !isNaN(item.price)
        ? (item.unidadesBonificadas * item.price).toFixed(4)
        : 0;

    item.totalGravado =
      !isNaN(item.valorGravado) && !isNaN(item.valorBonificado)
        ? (item.valorGravado - item.valorBonificado).toFixed(4)
        : 0;
    item.valorDescuento =
      !isNaN(item.totalGravado) && !isNaN(item.descuento)
        ? (item.totalGravado * (item.descuento / 100)).toFixed(4)
        : 0;
    if (name != 'costoReal') {
      item.costoReal =
        !isNaN(item.unidadesGravadas) &&
        !isNaN(item.valorDescuento) &&
        !isNaN(item.price) &&
        !isNaN(item.unidadesBonificadas)
          ? (
              (item.totalGravado - item.valorDescuento) /
              item.totalUnidades
            ).toFixed(4)
          : 0;
    }
    item.precioVenta =
      !isNaN(item.costoReal) && !isNaN(item.rentabilidad)
        ? (item.costoReal * (item.rentabilidad / 100 + 1)).toFixed(4)
        : 0;

    this.form.form.updateValueAndValidity();
    this.updateTotal();
  }
  duplicateItem(item: any) {
    var index = this.solicitud.documentLines.indexOf(item);
    var newObj = Object.assign(
      {},
      item
    );
    newObj.randomID = this.itemsUniqueCor++;
    console.log(newObj);
    this.solicitud.documentLines.splice(index + 1, 0, newObj);

    this.table.renderRows();
    this.updateTotal();
    // this.form.form.u

  }

  removeItem(item: any) {
    var index = this.solicitud.documentLines.indexOf(item);
    this.solicitud.documentLines.splice(index, 1);
    this.table.renderRows();
    this.updateTotal();
  }
  updateTotal() {
    this.subtotalFactura = this.solicitud.documentLines
      .reduce((a: any, b: any) => {
        console.log(
          a + b.costoReal * b.totalUnidades
        );
        return (
          a + b.costoReal * b.totalUnidades
        );
      }, 0.0)
      .toFixed(4);
    this.iva = (this.subtotalFactura * 0.13).toFixed(4);

    this.totalFactura = Number(this.subtotalFactura) + Number(this.iva);
  }

  public scrollRight(): void {
    var tabla = this.tableContainer.nativeElement.getElementsByClassName("items-table")[0]
    tabla.scrollTo({ left: (tabla.scrollLeft + 150), behavior: 'smooth' });
  }

  public scrollLeft(): void {
    var tabla = this.tableContainer.nativeElement.getElementsByClassName("items-table")[0]
    tabla.scrollTo({ left: (tabla.scrollLeft - 150), behavior: 'smooth' });
  }

}
