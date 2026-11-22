import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Sparkles,
  Gift,
  QrCode,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Users,
  PawPrint
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

const AmbassadorCommunitySection = () => {
  const { customer } = useCustomer();

  const pillars = [
    {
      icon: ShieldCheck,
      title: 'Adiós al ultraprocesado',
      text: 'Ingredientes frescos, reales y visibles. Cero harinas de desecho, cero preservantes químicos ni colorantes.'
    },
    {
      icon: Sparkles,
      title: 'Cambios que se notan',
      text: 'Digestiones livianas, pelaje brillante, menos alergias de piel, dientes más limpios y vitalidad real año tras año.'
    },
    {
      icon: PawPrint,
      title: 'Comunidad sin etiquetas',
      text: 'Para quiltros, razas grandes, pequeños, cachorros o seniors: todos merecen comer comida real, sin importar su historia.'
    }
  ];

  const steps = [
    {
      num: '1',
      title: 'Activa tu código y QR',
      desc: 'Entra a tu cuenta en Origen Canino y encuentra tu código personal, tu QR para mostrar en el parque y tu tarjeta lista para compartir.'
    },
    {
      num: '2',
      title: 'Compártelo con conciencia',
      desc: 'Envíaselo por WhatsApp o muéstrale tu QR a ese amigo o vecino del parque que quiere mejorar la salud de su perro.'
    },
    {
      num: '3',
      title: 'Ganan los dos',
      desc: 'Tu amigo ahorra 10% de descuento en su primera compra (sobre $30.000) y tú sumas $5.000 CLP sin tope para tu próximo pedido.'
    }
  ];

  return (
    <section
      id="familia-origen-canino"
      className="py-12 md:py-16 bg-gradient-to-b from-[#FAF7F2] via-[#F4EFE4] to-[#FAF7F2] border-y border-[#E8DFCE] scroll-mt-20"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Cabecera educativa y empática */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full mb-3 shadow-2xs">
            <Heart size={13} className="text-primary-green fill-primary-green/20" />
            Familia Origen Canino · Club de Embajadores
          </span>

          <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-extrabold text-secondary-brown tracking-tight leading-tight">
            Comparte Salud Real, <span className="text-primary-green">Sin Culpa y Con Conciencia</span>
          </h2>

          <p className="text-sm sm:text-base text-secondary-brown-light/90 mt-3.5 leading-relaxed font-sans">
            Durante años nos hicieron creer que las bolitas secas ultraprocesadas eran la única opción para nuestros perros.{' '}
            <strong className="text-secondary-brown font-semibold">
              Nadie tiene la culpa de no haberlo sabido antes, pero hoy podemos elegir mejor.
            </strong>{' '}
            Cuando ves el cambio en tu perro, contárselo a otro tutor también es un acto de cariño.
          </p>
        </div>

        {/* 3 Micro-pilares */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white/90 rounded-2xl p-5 border border-[#E6DCCB] shadow-2xs flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EBF2DA] text-primary-green flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-header font-bold text-base text-secondary-brown mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed font-sans">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dos Beneficios Claramente Separados (Cero confusión con kilos) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Tarjeta 1: Primera Compra */}
          <div className="bg-white rounded-3xl p-6 md:p-7 border border-[#E5DACD] shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#db994b]/10 blur-2xl pointer-events-none" />
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#b87624] bg-[#db994b]/10 px-3 py-1 rounded-full mb-3">
                <Sparkles size={12} /> Si es tu primera vez aquí
              </div>
              <h3 className="font-header text-2xl font-extrabold text-secondary-brown leading-snug">
                10% de Descuento en tu Primera Compra
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                ¿Quieres probar comida real sin compromiso ni suscripciones forzadas? Te damos un{' '}
                <strong className="text-secondary-brown">10% de descuento en el total de tu primer pedido</strong>{' '}
                usando el cupón <span className="font-mono font-bold text-secondary-brown bg-stone-100 px-1.5 py-0.5 rounded">BIENVENIDO10</span>{' '}
                o el código personal de un amigo embajador.
              </p>

              <ul className="mt-4 space-y-2 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#db994b] shrink-0" />
                  <span>Aplica en dietas BARF crudas, cocinadas al vapor y packs de transición.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#db994b] shrink-0" />
                  <span>Despacho con cadena de frío -18°C en Santiago y V Región.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100">
              <a
                href="#tienda"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-header font-bold text-[#b87624] hover:text-[#9a5f17] transition group"
              >
                <span>Explorar el catálogo fresco</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Tarjeta 2: Club de Embajadores */}
          <div className="bg-gradient-to-br from-[#2F3E1E] via-[#3C4F26] to-[#4A5F30] text-white rounded-3xl p-6 md:p-7 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#db994b]/20 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200 bg-white/10 px-3 py-1 rounded-full mb-3 border border-white/15">
                <Gift size={12} /> Para clientes · Club de Embajadores
              </div>
              <h3 className="font-header text-2xl font-extrabold leading-snug">
                Invita a un Amigo y Gana $5.000 CLP Sin Tope
              </h3>
              <p className="text-xs sm:text-sm text-white/90 mt-2 leading-relaxed">
                Cada vez que un amigo o vecino hace su primera compra (mínimo $30.000) usando tu código o QR,{' '}
                <strong className="text-amber-300">él recibe 10% de descuento</strong> y tú acumulas{' '}
                <strong className="text-amber-300">$5.000 CLP automáticos</strong> en tu billetera para comida de tu perro.
              </p>

              <ul className="mt-4 space-y-2 text-xs text-white/90">
                <li className="flex items-center gap-2">
                  <QrCode size={15} className="text-amber-300 shrink-0" />
                  <span>Código QR personal para mostrar en el parque + Tarjeta para WhatsApp e Instagram.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users size={15} className="text-amber-300 shrink-0" />
                  <span>Sin límite de amigos: puedes acumular saldo y pagar incluso tu pedido completo.</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center gap-3">
              <Link
                to="/mi-cuenta?tab=referrals"
                className="bg-[#db994b] hover:bg-[#c98336] text-white font-header font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-sm inline-flex items-center gap-2 group"
              >
                <QrCode size={16} />
                <span>{customer ? 'Ver mi Código y QR de Embajador' : 'Obtener mi Código de Embajador'}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Cómo funciona en 3 pasos */}
        <div className="bg-white/80 rounded-3xl border border-[#E6DCCB] p-6 md:p-7">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-primary-green mb-5">
            ¿Cómo funciona el Club de Embajadores?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-primary-green text-white font-header font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {s.num}
                </div>
                <div>
                  <h4 className="font-header font-bold text-sm text-secondary-brown mb-1">
                    {s.title}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed font-sans">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AmbassadorCommunitySection;

