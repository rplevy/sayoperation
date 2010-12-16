(ns sayoperation.validation
  (:use
   (clojure.contrib str-utils)
   (sayoperation utils)))


(defn valid-id [id]
  (and id
       (let [id (re-gsub #"[^a-z]" "" (lower-case id))]
         (and (> (count id) 2)
              id))))

(defn valid-act-move [move]
  (and
   (vector? move)
   (= 2 (count move))
   (number? (first move))
   (number? (second move))
   move))
          
(defn valid-instruct-move [move]
  (and
   (string? move)
   (let [move (re-gsub #"[^a-z\s]" "" (lower-case move))]
     move)))

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
       (if (some false? ~param-names)
         {:error "invalid input"}
         (do
           ~@body)))
     (catch Exception ~'e {:error (.getMessage
                                   (with-info "error calling service: " ~'e))})))
