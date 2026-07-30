import { Component, computed, input } from '@angular/core';

type AvatarSize = 'sm' | 'md' | 'lg';

const COLOR_CLASSES = [
  'avatar--brand',
  'avatar--green',
  'avatar--orange',
  'avatar--purple',
  'avatar--pink',
  'avatar--teal',
];

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly initials = computed(() =>
    this.name()
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );

  protected readonly colorClass = computed(() => {
    const index = (this.name().codePointAt(0) ?? 0) % COLOR_CLASSES.length;
    return COLOR_CLASSES[index];
  });
}
