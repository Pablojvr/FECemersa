import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder, FormGroup,
  Validators
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { debounceTime, finalize, switchMap, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { getServerErrorMessage } from '../index-compras/index-compras-datasource';
import { Usuario } from '../usuarios/usuarios-datasource';
import { ComprasService } from './../../services/compras.service';
import { ComprasDataSource } from './compras-datasource';

@Component({
  selector: 'app-compras',
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.css'],
})
export class ComprasComponent implements OnInit {
  comprasForm!: FormGroup;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<Usuario>;
  @ViewChild('input') input!: ElementRef;
  @ViewChild('tableContainer') tableContainer!: ElementRef;
  dataSource: ComprasDataSource;
  monthNames: any = [];
  numMonths: number = 0;
  numMontsCob: number = 0;
  laboratory: string = '327573';
  fecha: string = '';
  displayedColumns: any[] = [];
  initialColumns = ['codigo', 'descripcion', 'proveedor'];
  middleColumns = ['M1', 'M2'];
  onlyNewColums = ['vtaProm', 'existencia', 'sugerido'];
  endColumns = ['comprado','bonificado', 'punit', 'total','comentario'];
  filteredLabs: any;
  isLoading = false;
  errorMsg!: string;
  solicitud: any;
  saving: any = false;
  saved: any = false;
  comentario: any;
  diasCredito: any;
  fechaIngreso: any;
  descuento: any;

  constructor(
    private _router: Router,
    private _fb: FormBuilder,
    private comprasService: ComprasService,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {
    this.comprasForm = this._fb.group({
      numMonths: [2, [Validators.required]],
      nombreProveedor: [null],
      numMontsCob: [2, Validators.required],
      laboratory: [null, Validators.required],
      fecha: [new Date(), Validators.required],
    });
    this.dataSource = new ComprasDataSource(this.comprasService);
    // this.dataSource.getReporte(this.numMonths, this.numMontsCob, this.laboratory);
    this.updateDisplayedColumns();

    this.comprasForm.controls.laboratory.valueChanges
      .pipe(
        debounceTime(500),
        tap(() => {
          this.errorMsg = '';
          this.filteredLabs = [];
          this.isLoading = true;
        }),
        switchMap((value) =>
          this.comprasService.getProveedores(value ?? '').pipe(
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
  }

  displayFn(data: any): string {
    console.log(data);
    return data ? data.groupName : '';
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
    if (id) {
      this.comprasService.getSolicitudCompraByID(id).subscribe((data) => {
        if (data == undefined) {
          this.errorMsg = data['Error'];
          this.solicitud = null;
        } else {
          this.errorMsg = '';
          this.solicitud = data;

          this.comprasForm.setValue({
            laboratory: {
              groupName: this.solicitud.groupName,
              number: this.solicitud.groupCode,
            },
            numMonths: this.solicitud.numMonths?? 4,
            numMontsCob: this.solicitud.numMontsCob?? 2,
            nombreProveedor: '',
            fecha: this.solicitud.fecha,
          });
          this.numMonths = this.solicitud.numMonths?? 4;
          this.updateDisplayedColumns();


          this.comentario= this.solicitud.comentario;
          this.fechaIngreso= this.solicitud.fechaIngreso;
          this.descuento= this.solicitud.descuento;
          this.diasCredito= this.solicitud.diasCredito;
          this.dataSource.getReporte(this.solicitud.numMonths?? 4, this.solicitud.numMontsCob?? 2, this.solicitud.groupCode, () => {
            this.setSolicitudData();
          });
        }
        this.isLoading = false;
        console.log(data);
        console.log(this.solicitud);
      });
    }
  }
  get form() {
    return this.comprasForm.controls;
  }
  onSubmit() {
    this.numMonths = this.form.numMonths.value;
    this.numMontsCob = this.form.numMontsCob.value;
    var laboratoryData = this.form.laboratory.value;
    this.laboratory = laboratoryData.number;
    this.fecha = this.form.fecha.value;
    this.updateDisplayedColumns();
    if (!this.numMonths || !this.numMontsCob || !this.laboratory) {
      Swal.fire({
        title: '',
        text: 'Uno o mas campos estan vacios',
        icon: 'error',
        heightAuto: false,
      });
      return;
    }
    console.log(this.numMonths, this.numMontsCob, this.laboratory);
    this.dataSource.getReporte(
      this.numMonths,
      this.numMontsCob,
      this.laboratory,
      ()=>{
        if(this.solicitud!=null){
          this.setSolicitudData();
        }
      }
    );
  }

  getProveedores() {
    this.isLoading = true;
    this.comprasService.getProveedores('').subscribe((data) => {
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

  updateDisplayedColumns() {
    // var currentMonth = moment().locale('es').format('MMMM');
    // this.monthNames = [currentMonth];
    this.middleColumns = [...Array(this.numMonths).keys()].map((value, i) => {
      this.monthNames.push(
        moment().add(-i, 'M').locale('es').format('MMMM - YY')
      );
      return `M${i + 1}`;
    });
    this.monthNames = this.monthNames.reverse();
    var endArray =
      // this.solicitud == null
        // ?
        [...this.onlyNewColums, ...this.endColumns];
        // : this.endColumns;
    this.displayedColumns = [
      ...this.initialColumns,
      ...this.middleColumns,
      ...endArray,
    ];
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
          BONIFICADO:item.u_EJJE_UBonificada,
          u_EJJE_Concepto:item.u_EJJE_Concepto,
          PUNIT: parseFloat(item.price),
          PROVEEDOR: item.cardName,
          CARDCODE: item.cardCode,
          VATCODE: item.vatCode,
          SUGERIDO: item.sugerido??found.SUGERIDO,
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
  //         Price: item.PUNIT,
  //         LineNum: index,
  //       };
  //     });

  //   var solicitud = {
  //     RequriedDate: this.fecha,
  //     DocumentLines: articulosSolicitados,
  //   };

  //   console.log(solicitud);
  // }
  abrirFacturas() {
    Swal.fire({
      title: '',
      text: 'Guardando...',
      icon: 'info',
      heightAuto: false,
      showCancelButton: false,
      showConfirmButton: false,
    });

    this.comprasService
      .abrirSolicitud(
        this.solicitud.idSolicitudCompra
      )
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
              this._router.navigate(['/compras']);
            },
            (dismiss: any) => {
              this._router.navigate(['/compras']);
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
  }

  guardarSolicitud(aprobar: any = 1) {
    var articulosSolicitados = this.dataSource.usuarioSubject
      .getValue()
      .filter((item: any) => item.COMPRAR > 0)
      .map((item: any, index: number) => {
        return {
          itemCode: item.ITEMCODE,
          itemName: item.NOMBRE,
          cardCode: item.CARDCODE,
          cardName: item.PROVEEDOR,
          vatCode: item.VATGROUP,
          amount: item.COMPRAR,
          price: item.PUNIT,
          u_EJJE_UBonificada:item.BONIFICADO??0,
          u_EJJE_Concepto:item.u_EJJE_Concepto,
          line: index,
          sugerido:item.SUGERIDO.toString()
        };
      });
      if(articulosSolicitados.length == 0){
        Swal.fire({
          title: 'Solicitud de compra sin articulos!',
          text: 'Esta intentando guardar una solicitud de compra vacia!',
          icon: 'info',
          heightAuto: false,
          showCancelButton: false,
          showConfirmButton: false,
        });
        return;
      }
    var solicitud = null;
    if (this.solicitud != null) {
      solicitud = Object.assign(this.solicitud, {
        articulos: articulosSolicitados,
        fecha: this.form.fecha.value,
        comentario:this.comentario,
        diasCredito:this.diasCredito,
        fechaIngreso:this.fechaIngreso,
        descuento:this.descuento
      });
    } else {
      var laboratoryData = this.form.laboratory.value;
      this.laboratory = laboratoryData.number;
      solicitud = {
        fecha: this.fecha,
        groupCode: laboratoryData.number + '',
        groupName: laboratoryData.groupName,
        articulos: articulosSolicitados,
        comentario:this.comentario,
        diasCredito:this.diasCredito,
        fechaIngreso:this.fechaIngreso,
        descuento:this.descuento
      };
    }

    solicitud.estadoSolicitudFK = aprobar;

    Swal.fire({
      title: '',
      text: 'Guardando...',
      icon: 'info',
      heightAuto: false,
      showCancelButton: false,
      showConfirmButton: false,
    });
    this.comprasService.saveSolicitudDeCompra(solicitud).subscribe({
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
            this._router.navigate(['/compras']);
          },
          (dismiss: any) => {
            this._router.navigate(['/compras']);
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
          html: errorMsg,
          icon: 'error',
          heightAuto: false,
        });
        this.saving = false;
        this.saved = false;
      },
    });

    console.log(solicitud);
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
