(ns sayoperation.validation
  (:use
   (clojure.contrib str-utils)
   (sayoperation utils)))


(defn valid-id [id]
  (and id
       (let [id (re-gsub #"[^a-z]" "" (lower-case id))]
         (and (> (count id) 2)
              id))))

(defn valid-coordinates? [coords]
  (and
   (vector? coords)
   (= 2 (count coords))
   (number? (first coords)) 
   (number? (second coords))))

(defn valid-act-move [move]
  (and
   (map? move)
   (valid-coordinates? (:subject move))
   (valid-coordinates? (:target move))
   move))
          
(defn valid-instruct-move [move]
  (and
   (map? move)
   (string? (:instruction move))
   (let [move-str (re-gsub #"[^a-z\s]" "" (lower-case (:instruction move)))]
     {:instruction move-str})))

(defn valid-move [move]
  (and move
       (or
        (valid-instruct-move move)
        (valid-act-move move))))

(defn valid [{:keys [id id1 id2 move]} & body]
  (filter (comp not nil?) [(valid-id id) (valid-id id1)
                           (valid-id id2) (valid-move move)]))

(defmacro with-caution
  "handle validation and place an ubercatch on stray exceptions"
  [[param-names param-type-map] & body]
  `(try
     (let [~(vec param-names) (vec (valid ~param-type-map))]
       (if (or (some false? ~param-names)
               (some nil? ~param-names))
         {:error "invalid input"}
         (do
           ~@body)))
     (catch Exception ~'e {:error (.getMessage
                                   (with-info "error calling service: " ~'e))})))
