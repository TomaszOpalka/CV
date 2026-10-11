import { Contact } from '@/components/sections/Contact';
import { Education } from '@/components/sections/Education';
import { Experience } from '@/components/sections/Experience';
import { Intro } from '@/components/sections/Intro';
import { Portfolio } from '@/components/sections/Portfolio';
import { Stack } from '@/components/sections/Stack';

export default function HomePage() {
  return (
    <main>
      <Intro />
      <Portfolio />
      <Experience />
      <Stack />
      <Education />
      <Contact />
    </main>
  );
}
