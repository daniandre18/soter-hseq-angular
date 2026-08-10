import { Component, computed, input } from '@angular/core';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarTone = 'auto' | 'session';

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
  readonly tone = input<AvatarTone>('auto');

  protected readonly initials = computed(() =>
    this.name()
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );

  protected readonly colorClass = computed(() => {
    if (this.tone() === 'session') {
      return 'avatar--session';
    }

    const index = (this.name().codePointAt(0) ?? 0) % COLOR_CLASSES.length;
    return COLOR_CLASSES[index];
  });
}
