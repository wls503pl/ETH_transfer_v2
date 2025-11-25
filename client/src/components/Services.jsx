import { BsShieldFillCheck } from "react-icons/bs";
import { BiSearchAlt } from "react-icons/bi";
import { RiHeart2Fill } from "react-icons/ri";

const ServiceCard = ({ color, title, icon, subtitle }) => (
  <div className="flex flex-row justify-start items-start white-glassmorphism p-4 m-2 cursor-pointer hover:shadow-xl">
    <div
      className={`w-10 h-10 rounded-full flex justify-center items-center flex-shrink-0 ${color}`}
    >
      {icon}
    </div>
    <div className="ml-5 flex flex-col flex-1">
      <h1 className="text-white text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-white text-sm leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

const Services = () => {
  return (
    <div className="gradient-bg-services w-full">
      <div className="flex flex-col lg:flex-row w-full justify-between items-start gap-20 py-12 px-4 md:px-20 max-w-7xl mx-auto">
        <div className="flex-1 flex flex-col justify-start items-start">
          <h1 className="text-white text-3xl sm:text-5xl py-2 text-gradient">
            Services that we
            <br />
            continue to improve
          </h1>
        </div>

        <div className="flex-1 flex flex-col justify-start items-stretch w-full">
          <ServiceCard
            color="bg-[#2952E3]"
            title="Security Guaranteed"
            icon={<BsShieldFillCheck fontSize={21} className="text-white" />}
            subtitle="Advanced encryption and multi-signature protocols protect your assets. Our platform undergoes regular security audits to ensure your funds remain safe at all times."
          />
          <ServiceCard
            color="bg-[#8945F8]"
            title="Best exchange rates"
            icon={<BiSearchAlt fontSize={21} className="text-white" />}
            subtitle="Real-time market data and optimized algorithms ensure you always get competitive rates. We minimize slippage and provide transparent pricing with zero hidden fees."
          />
          <ServiceCard
            color="bg-[#F84550]"
            title="Fastest transactions"
            icon={<RiHeart2Fill fontSize={21} className="text-white" />}
            subtitle="Experience lightning-fast transaction speeds powered by optimized smart contracts. Our infrastructure ensures rapid settlement while maintaining network security and reliability."
          />
        </div>
      </div>
    </div>
  );
};

export default Services;
