import { Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('text');
  readonly width = input('100%');
  readonly height = input<string>();
  readonly radius = input<string>();
  readonly count = input(1);

  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
