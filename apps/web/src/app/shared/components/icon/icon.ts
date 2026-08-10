import { Component, input } from '@angular/core';

// Subconjunto de iconos de Lucide (lucide-static, ISC) usados por la app,
// embebidos como SVG propio: lucide-angular todavía no soporta Angular 22
// (peer range "13.x - 21.x"), así que se evita esa dependencia y se
// incrustan solo los que necesitamos, con el mismo trazo/proporciones.
export type IconName =
  | 'clipboard-list'
  | 'circle-check-big'
  | 'triangle-alert'
  | 'clock'
  | 'building-2'
  | 'map-pin'
  | 'calendar-days'
  | 'hard-hat'
  | 'file-text'
  | 'x'
  | 'chevron-left'
  | 'chevron-right'
  | 'menu'
  | 'bell'
  | 'globe'
  | 'layout-dashboard'
  | 'log-out'
  | 'chart-pie'
  | 'tag'
  | 'wrench'
  | 'eye'
  | 'square-pen'
  | 'trash-2'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevrons-down'
  | 'search'
  | 'sliders-horizontal'
  | 'plus'
  | 'message-square'
  | 'image'
  | 'upload-cloud'
  | 'paperclip'
  | 'flag'
  | 'phone'
  | 'mail'
  | 'external-link'
  | 'download'
  | 'printer'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'contrast'
  | 'settings'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'arrow-left'
  | 'arrow-right';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
})
export class Icon {
  readonly name = input.required<IconName>();
}
