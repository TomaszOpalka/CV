import { Contact } from '@/components/sections/Contact';
import { Education } from '@/components/sections/Education';
import { Experience } from '@/components/sections/Experience';
import { Intro } from '@/components/sections/Intro';
import { Pixels } from '@/components/sections/Pixels';
import { Stack } from '@/components/sections/Stack';

export default function HomePage() {
  return (
    <main>
      <Intro />
      <Pixels />
      <Experience />
      <Stack />
      <Education />
      <Contact />
    </main>
  );
}
