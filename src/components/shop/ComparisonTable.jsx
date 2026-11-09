import React from 'react';
import { Droplets, Activity, Utensils, FlaskConical, Sparkles, Box, Soup, Leaf } from 'lucide-react';

const criteriaData = [
  {
    icon: Droplets,
    iconColor: 'text-sky-500',
    title: 'Humedad Natural',
    pellet: '10% (Deshidratante para riñones)',
    pelletBad: true,
    cocinada: '70% (Humedad Natural)',
    barf: '75% (Hidratación Celular Óptima)',
  },
  {
    icon: Activity,
    iconColor: 'text-amber-600',
    title: 'Digestibilidad',
    pellet: 'Baja (~40–50% con relleno)',
    pelletBad: false,
    cocinada: 'Alta (~88% fácil asimilación)',
    barf: 'Máxima (~95% absorción bio-disponible)',
  },
  {
    icon: Utensils,
    iconColor: 'text-emerald-600',
    title: 'Ingredientes Grado Humano',
    pellet: 'No (Subproductos y harinas)',
    pelletBad: true,
    cocinada: 'Sí (100% carnes y vegetales aptos consumo humano)',
    barf: 'Sí (100% carnes de libre pastoreo y superfoods)',
  },
  {
    icon: FlaskConical,
    iconColor: 'text-purple-500',
    title: 'Conservantes Artificiales',
    pellet: 'Sí (BHA, BHT, químicos)',
    pelletBad: true,
    cocinada: '0% Sin químicos ni aditivos',
    barf: '0% Ultracongelado a -18°C',
  },
  {
    icon: Sparkles,
    iconColor: 'text-blue-500',
    title: 'Salud Dental',
    pellet: 'Produce sarro y placa bacteriana',
    pelletBad: false,
    cocinada: 'Reduce sarro progresivamente',
    barf: 'Limpia el sarro naturalmente por acción enzimática',
  },
];

const ComparisonTable = () => {
  return (
    <section className="py-6 md:py-8 bg-[#FAF7F2]">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto mb-5 md:mb-6">
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2.5">
            Diferencia Evolutiva
          </span>
          <h2 className="font-header text-3xl sm:text-4xl font-extrabold text-secondary-brown tracking-tight">
            ¿Por Qué Alimentación Natural?
          </h2>
          <p className="text-xs sm:text-sm text-secondary-brown-light/80 mt-2 font-sans">
            Compara la verdad nutricional de los ultraprocesados comerciales frente a nuestra comida real.
          </p>
        </div>

        {/* Tabla Estilo Stitch con Columnas Destacadas */}
        <div className="bg-white rounded-3xl border border-[#EBE4DA] shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-[#EBE4DA] text-xs sm:text-sm font-header">
                  <th className="py-4 px-5 text-secondary-brown font-bold w-[24%]">
                    Criterio Nutricional
                  </th>
                  <th className="py-4 px-4 text-gray-500 font-bold w-[25%]">
                    <div className="flex items-center gap-2">
                      <Box size={16} className="text-gray-400 shrink-0" />
                      <span>Pellet Comercial</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 text-[#A65B2A] font-bold w-[25%] bg-[#FDF7ED]/80">
                    <div className="flex items-center gap-2">
                      <Soup size={16} className="text-[#A65B2A] shrink-0" />
                      <span>Origen Canino Cocinada</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 text-primary-green font-bold w-[26%] bg-[#F2F7EC]/80">
                    <div className="flex items-center gap-2">
                      <Leaf size={16} className="text-primary-green shrink-0" />
                      <span>Origen Canino BARF</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3] text-xs sm:text-sm font-sans">
                {criteriaData.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                      {/* Criterio */}
                      <td className="py-4 px-5 font-bold text-secondary-brown">
                        <div className="flex items-center gap-2.5">
                          <Icon size={18} className={`${item.iconColor} shrink-0`} />
                          <span>{item.title}</span>
                        </div>
                      </td>

                      {/* Pellet Comercial */}
                      <td className="py-4 px-4 text-secondary-brown-light">
                        {item.pelletBad ? (
                          <span className="text-accent-red font-semibold">{item.pellet}</span>
                        ) : (
                          <span className="text-gray-500">{item.pellet}</span>
                        )}
                      </td>

                      {/* Cocinada (Columna Cálida) */}
                      <td className="py-4 px-4 font-medium text-secondary-brown bg-[#FDF7ED]/40">
                        {item.cocinada}
                      </td>

                      {/* BARF (Columna Verde) */}
                      <td className="py-4 px-4 font-semibold text-secondary-brown bg-[#F2F7EC]/40">
                        {item.barf}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Nota al pie móvil */}
          <div className="bg-[#FAF7F2] px-5 py-3 border-t border-[#EBE4DA] text-[11px] text-gray-500 flex items-center justify-between">
            <span>← Desliza horizontalmente en pantalla táctil para ver todas las columnas →</span>
            <span className="font-semibold text-primary-green">100% Grado Humano Certificado</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ComparisonTable;
