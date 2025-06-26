// frontend\src\components\Hero.tsx
import hero from '../assets/app-hero.png';

const Hero = () => {
  return (
    <div>
      <img src={hero} className="w-full max-h-[600px] object-cover" />
    </div>
  );
};

export default Hero;
