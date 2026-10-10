import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CobrosService, DiaPlaza } from '../../core/services/cobros.service';
import { ReportesService, DetalleCobroReporte, ResumenReporte } from '../../core/services/reportes.service';

// Importación de jsPDF y autoTable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class ReportesComponent implements OnInit {
  diasPlaza: DiaPlaza[] = [];
  diaSeleccionadoId: number | null = null;
  cobros: DetalleCobroReporte[] = [];
  fotoSeleccionadaUrl: string | null = null;
 puestoSeleccionadoNumero: string = '';

  cargandoDias = false;
  cargandoReporte = false;
  generandoPdf = false;
  error = '';

  resumen: ResumenReporte = {
    totalRecaudado: 0,
    totalCobrados: 0,
    totalNoLlego: 0,
    totalRegistros: 0
  };

  constructor(
    private cobrosService: CobrosService,
    private reportesService: ReportesService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDiasPlaza();
  }

  async cargarDiasPlaza(): Promise<void> {
    this.cargandoDias = true;
    this.error = '';

    try {
      this.diasPlaza = await this.cobrosService.obtenerDiasPlaza();
      if (this.diasPlaza.length > 0) {
        this.diaSeleccionadoId = this.diasPlaza[0].id;
        await this.cargarDetalleReporte();
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error al cargar días.';
    } finally {
      this.cargandoDias = false;
      this.cdr.detectChanges();
    }
  }

  async alCambiarDia(): Promise<void> {
    if (this.diaSeleccionadoId !== null) {
      await this.cargarDetalleReporte();
    }
  }

  async cargarDetalleReporte(): Promise<void> {
    if (!this.diaSeleccionadoId) return;

    this.cargandoReporte = true;
    this.error = '';

    try {
      this.cobros = await this.reportesService.obtenerCobrosPorDia(this.diaSeleccionadoId);
      this.calcularResumen();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error al cargar detalles del reporte.';
    } finally {
      this.cargandoReporte = false;
      this.cdr.detectChanges();
    }
  }

  private calcularResumen(): void {
    let recaudado = 0;
    let cobrados = 0;
    let noLlego = 0;

    for (const item of this.cobros) {
      if (item.estado === 'COBRADO') {
        recaudado += item.monto;
        cobrados++;
      } else if (item.estado === 'NO_LLEGO') {
        noLlego++;
      }
    }

    this.resumen = {
      totalRecaudado: recaudado,
      totalCobrados: cobrados,
      totalNoLlego: noLlego,
      totalRegistros: this.cobros.length
    };
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.substring(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }


  abrirEvidencia(cobro: DetalleCobroReporte): void {
  if (!cobro.foto_url) return;
  
  this.fotoSeleccionadaUrl = this.reportesService.obtenerUrlEvidencia(cobro.foto_url);
  this.puestoSeleccionadoNumero = cobro.puesto_numero;
}

cerrarModalEvidencia(): void {
  this.fotoSeleccionadaUrl = null;
  this.puestoSeleccionadoNumero = '';
}
  // Generación y descarga directa del archivo PDF
  descargarPDF(): void {
    if (this.cobros.length === 0) return;

    this.generandoPdf = true;

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const diaObj = this.diasPlaza.find(d => d.id === this.diaSeleccionadoId);
      const fechaTexto = diaObj ? this.formatearFecha(diaObj.fecha) : '';

      // 1. Encabezado principal
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 27, 75);
      doc.text('PLAZA LLANOS DEL PINAL', 14, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(5, 150, 105);
      doc.text(`Reporte Oficial de Cobros — Fecha: ${fechaTexto}`, 14, 25);

      // Línea divisoria sutil
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 28, 196, 28);

      // 2. Métricas una debajo de otra (X fija en 14 mm, Y aumentando de 5 en 5 mm)
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      doc.setFont('helvetica', 'bold');
      doc.text('Resumen del día:', 14, 34);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Total Recaudado: Q ${this.resumen.totalRecaudado.toFixed(2)}`, 14, 40);
      doc.text(`• Puestos Cobrados: ${this.resumen.totalCobrados}`, 14, 45);
      doc.text(`• Inasistencias (No llegó): ${this.resumen.totalNoLlego}`, 14, 50);
      doc.text(`• Total de Puestos Evaluados: ${this.resumen.totalRegistros}`, 14, 55);

      // 3. Tabla de datos
      const cuerpoTabla = this.cobros.map(c => [
        `Puesto ${c.puesto_numero}`,
        c.vendedor,
        c.tipo_puesto,
        c.cobrador,
        c.estado === 'COBRADO' ? 'Cobrado' : 'No llegó',
        `Q ${c.monto.toFixed(2)}`,
        c.observacion || '—'
      ]);

      autoTable(doc, {
        startY: 62, // Inicia debajo del bloque de métricas
        head: [['Puesto', 'Vendedor', 'Tipo', 'Cobrador', 'Estado', 'Monto', 'Observación']],
        body: cuerpoTabla,
        theme: 'striped',
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          5: { halign: 'right' }
        }
      });

      // 4. Descargar archivo
      const nombreArchivo = `Reporte_Cobros_${fechaTexto.replace(/\//g, '-')}.pdf`;
      doc.save(nombreArchivo);
    } catch (e) {
      console.error('Error al generar PDF:', e);
      this.error = 'No se pudo generar el archivo PDF.';
    } finally {
      this.generandoPdf = false;
      this.cdr.detectChanges();
    }
  }
}