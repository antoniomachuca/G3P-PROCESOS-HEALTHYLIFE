# EJERCICIO 1.1. 


## CASO A

En el Caso A elegimos hibrido: 
  - No disponemos de una fecha de entrega concreta, esto nos hace pensar que la metodología ágil podría ser una opción
  - No tenemos un cliente como tal por lo que no tendremos una fase de extracción de requisitos lo que tambien nos hace pensar que puede ser metodología ágil
  - Los errores se penalizan bastante, si algo falla nos cuesta 1 cliente por lo que tiene que lanzarse una fase de testing antes de que llegue al publico, esto nos hace pensar que puede ser cascada
  - Al ser un equipo pequeño de 3 personas pensamos que estar haciendo todo el rato release descartaria metodologias ágiles 
  - Como no sabemos que funciones van a usar los usuarios pensamos que sabemos que tenemos que ir iterando un mínimo por lo que puede ser ágil

### Uso IA: 
- Requisitos: como no tenemos cliente podemos usar la IA como cliente y que nos diga que requisitos pueden tener nuestra extensión y obviamente en la redacción de los mismos. En el caso de redactar los requisitos tendrá una AUTONOMIA ALTA, pero para especificar los requisitos SUPERVISION TOTAL por si vemos que con un requisito a alucinado o algo asi
- Diseño: lo hacemos nosotros, no creemos que la IA diseñe bien
- Implementacion: para el codigo pensamos que lo mejor es supervisión parcial, como la IA es buena haciendo código con estar un poco pendiente nos sirve 
- Pruebas: la creación de las creara la IA con autonomia alta, queremos tener muchos tests para que no se nos vayan los usuarios por lo que pensamos que la IA las puede hacer mucho más rápido y en mayor cantidad. 
- Despliegue: como es una extensión de navegador el despliegue es muy simple y no necesitaremos IA
- Mantenimiento: se realizará con la ayuda de la IA con supervisión parcial (queremos llevar cuidado con lo que haga)
- El tema de la exposición del correo como es de seguridad queremos tener el control total, aqui no se usara nada de IA ni para la implementación ni para los test que vayan del correo
  
### Estimación de entregas y planificacion release
No hay fecha de entrega, como trabajan de forma parcial con 3 personas estimamos 2 meses.

Si no tuvieramos IA este proyecto requeriría unos 4 meses, los procesos con la IA se automatizan bastante reduciendo los tiempos.



## CASO B

En el caso B elegimos ágil: 
- Tenemos que ir iterando cada pocas semanas debido a los cambios por lo que 100% tendrá que ser metodologia ágil
- Como tenemos una demo muy importante creemos que ir enseñandole cosas al cliente antes de la gran demo, lo que nos hace pensar que será ágil también
- No hay referencias de ningun tipo por lo que vamos a ciegas y tendremos que improvisar e ir validandolo con el cliente, por lo que tendrá que ser una metodología ágil 
- Como el cliente cambia a menudo de opinion nos podrá tirar abajo gran parte de trabajo, si fuese cascada tendríamos que volver al principio y todo el trabajo que hemos hecho antes no valdria de nada, otra razón para ágil.
- Es mas facil recibir el feedback de los "stakeholders"
  
### Uso IA:
- Requisitos: como el cliente cambia mucho de opinión, usaremos la IA para resumir reuniones y sacar requisitos. Tendrá supervisión total porque si la IA se inventa algún requisito, se cae el proyecto.
- Diseño: le daremos una supervisión parcial, como la plataforma del chatbot cambia cada pocas semanas y no tenemos ningún producto de referencia, le pediremos a la IA ideas de como enfocar el diseño, pero la decisión final la tomamos nosotros.
- Implementación:para el código usaremos supervisión parcial, como tenemos la demo en dos meses, nos viene bien que la IA nos pique el código de los componentes visuales para avanzar rápido. Con estar un poco pendientes y revisarlo nosotros nos sirve.
Pruebas: las creará la IA con autonomía alta. Tenemos un plazo muy cerrado y necesitamos que la IA genere los tests muy rápido y en gran cantidad para asegurarnos de que nada falle en la demo.
- Despliegue: usaremos supervisión total, si algo falla en la demo se cae el contrato, por lo que no podemos arreisgarnos a que la IA suba cosas por si sola.
- Mantenimiento:se hará con la ayuda de la IA con supervisión parcial. Como la plataforma cambia cada pocas semanas y las cosas pueden dejar de funcionar, la usaremos para que nos ayude a encontrar los errores rápidamente.
- La actividad que nunca dejaríamos en autonomía alta es el despliegue, queremos tener todo el control de las versiones que publicamos.

### Estimación de entregas y planificación release
Hay fecha de entrega de 2 meses para la demo, como el cliente cambia de opinión a menudo pensamos hacer releases cortas de 1 o 2 semanas.
Sin la IA sería casi imposible llegar a tiempo a la demo, ya que al dejar que se encargue del código y los tests vamos mucho más rápido.





## IDENTIFICACION DE DIFERENCIAS
La principal diferencia entre ambos casos es el ciclo de vida elegido. En el Caso A utilizamos un modelo híbrido, ya que necesitamos cierta iteración para descubrir qué funcionalidades utilizan realmente los usuarios, pero también un mayor control en aspectos como la seguridad y las pruebas. En cambio, en el Caso B utilizamos un modelo ágil, porque los requisitos cambian constantemente, el cliente da feedback frecuente y la plataforma evoluciona cada pocas semanas.

Además, en el Caso A no tenemos una fecha de entrega externa, mientras que en el Caso B tenemos una demo en dos meses, lo que obliga a realizar releases más cortas y frecuentes.
