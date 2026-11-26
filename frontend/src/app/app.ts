import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/notificacao.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatProgressBarModule],
  template: `
    @if (loading.carregando()) {
      <mat-progress-bar mode="indeterminate" class="barra-global" />
    }
    <router-outlet />
  `,
})
export class App {
  loading = inject(LoadingService);

  constructor() {
    // Usa a fonte "Material Symbols" carregada no index.html para todos os <mat-icon>
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }
}
