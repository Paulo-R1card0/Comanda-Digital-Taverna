import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ConfirmarData {
  titulo: string;
  mensagem: string;
  confirmar?: string;
  perigo?: boolean;
}

/** Diálogo de confirmação simples. Retorna true quando o usuário confirma. */
@Component({
  selector: 'app-confirmar-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content><p>{{ data.mensagem }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Voltar</button>
      <button mat-flat-button [class.botao-perigo]="data.perigo" [mat-dialog-close]="true">
        {{ data.confirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarDialog {
  data = inject<ConfirmarData>(MAT_DIALOG_DATA);
}

/** Pede um motivo obrigatório (ex.: cancelamento de pedido - RF-018). Retorna o texto digitado. */
@Component({
  selector: 'app-motivo-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p>{{ data.mensagem }}</p>
      <mat-form-field class="largura-total">
        <mat-label>Motivo</mat-label>
        <textarea matInput [formControl]="motivo" rows="3" cdkFocusInitial></textarea>
        @if (motivo.hasError('required')) {
          <mat-error>Informe o motivo</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Voltar</button>
      <button mat-flat-button class="botao-perigo" (click)="confirmar()">{{ data.confirmar ?? 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
})
export class MotivoDialog {
  data = inject<ConfirmarData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<MotivoDialog>);
  motivo = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] });

  confirmar(): void {
    this.motivo.markAsTouched();
    if (this.motivo.valid && this.motivo.value.trim()) {
      this.ref.close(this.motivo.value.trim());
    }
  }
}
