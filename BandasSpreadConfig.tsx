import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BandasSpreadConfigProps {
  quantidadeCamadas?: number;
  setQuantidadeCamadas?: (value: number) => void;
  percentualBanda?: number;
  estatisticas?: {
    spreadMin?: number;
    spreadMax?: number;
  };
  faixaPersonalizada?: boolean;
  setFaixaPersonalizada?: (value: boolean) => void;
  spreadMin?: number;
  setSpreadMin?: (value: number) => void;
  spreadMax?: number;
  setSpreadMax?: (value: number) => void;
  bandasSpread?: any[];
}

export default function BandasSpreadConfig({
  quantidadeCamadas = 5,
  setQuantidadeCamadas = () => {},
  percentualBanda = 2,
  estatisticas,
  faixaPersonalizada = false,
  setFaixaPersonalizada = () => {},
  spreadMin = 0,
  setSpreadMin = () => {},
  spreadMax = 0,
  setSpreadMax = () => {},
  bandasSpread = []
}: BandasSpreadConfigProps) {
  // Safe access to estatisticas properties
  const spreadMinValue = estatisticas?.spreadMin?.toFixed(2) || '0.00';
  const spreadMaxValue = estatisticas?.spreadMax?.toFixed(2) || '0.00';

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Configuração de Bandas de Spread</CardTitle>
        <CardDescription>Defina suas bandas de negociação e camadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">Número de Camadas</Label>
              <Input
                type="number"
                value={quantidadeCamadas}
                onChange={(e: any) => setQuantidadeCamadas(Math.max(2, Number(e.target.value)))}
                min="2"
                max="20"
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Limites da Banda ({percentualBanda}%)</p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-xs text-gray-500">Spread Mínimo</p>
                  <p className="font-bold text-blue-900">R$ {spreadMinValue}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Spread Máximo</p>
                  <p className="font-bold text-blue-900">R$ {spreadMaxValue}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="faixa-personalizada"
                checked={faixaPersonalizada}
                onChange={(e: any) => setFaixaPersonalizada(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <Label htmlFor="faixa-personalizada" className="text-sm font-medium">
                Usar faixa personalizada
              </Label>
            </div>
            
            {faixaPersonalizada && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Spread Mínimo (R$)</Label>
                  <Input
                    type="number"
                    value={spreadMin}
                    onChange={(e: any) => setSpreadMin(Number(e.target.value))}
                    step="0.1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium mb-1 block">Spread Máximo (R$)</Label>
                  <Input
                    type="number"
                    value={spreadMax}
                    onChange={(e: any) => setSpreadMax(Number(e.target.value))}
                    step="0.1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium mb-2">Camadas de Spread</h3>
          <div className="flex flex-wrap gap-2">
            {bandasSpread.map((banda, indice) => (
              <div 
                key={indice} 
                className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {banda?.rotulo || `Camada ${indice + 1}`}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}